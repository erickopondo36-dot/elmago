// ==================== CONFIGURATION ====================
const defaultSubjectsBySection = {
  primary: [
    "English", "Maths", "Kiswahili", "CRE", "Social Studies",
    "Agriculture and Home Science", "Creative Arts and Sports",
    "Integrated Science", "Pretechnical Studies"
  ],
  junior: [
    "Mathematics", "Kiswahili Paper 1", "Kiswahili Paper 2",
    "English Paper 1", "English Paper 2", "Integrated Science",
    "Social Studies", "CRE", "Agriculture and Nutrition",
    "Pretechnical Studies", "Creative Arts and Sports"
  ]
};

const defaultClasses = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9"
];

const schoolName = "Ndumbinyi Primary and Junior School";
const apiAvailable = location.protocol !== "file:";

// ==================== DATA MANAGEMENT ====================
function load(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

function normalizeSubjectsBySection(subjects) {
  if (!subjects || typeof subjects !== "object") return defaultSubjectsBySection;
  return {
    primary: Array.isArray(subjects.primary) ? subjects.primary : defaultSubjectsBySection.primary,
    junior: Array.isArray(subjects.junior) ? subjects.junior : defaultSubjectsBySection.junior
  };
}

// ==================== INITIALIZATION ====================
let subjectsBySection = normalizeSubjectsBySection(
  load("schoolEvalSubjects", defaultSubjectsBySection)
);
let learners = load("schoolEvalLearners", []);
let classes = load("schoolEvalClasses", defaultClasses);

// Normalize class names
classes = [...new Set([...defaultClasses, ...classes])];
classes = classes.filter(className => !["Grade 7 East", "Grade 7 West"].includes(className));

learners = learners.map(learner => {
  if (["Grade 7 East", "Grade 7 West"].includes(learner.className)) {
    return { ...learner, className: "Grade 7" };
  }
  return learner;
});

let activeSection = load("schoolEvalActiveSection", "primary");
let activeClassName = load("schoolEvalActiveClass", "Grade 1");

// ==================== HELPER FUNCTIONS ====================
function sectionClasses(section) {
  return defaultClasses.filter(cls => {
    const gradeNum = parseInt(cls.replace("Grade ", ""));
    if (section === "primary") return gradeNum <= 6;
    if (section === "junior") return gradeNum >= 7;
    return true;
  });
}

function getSubjectsForClass() {
  return subjectsBySection[activeSection] || [];
}

function getClassLearners(className) {
  return learners.filter(l => l.className === className);
}

function calculateClassStats(className) {
  const classLearners = getClassLearners(className);
  if (classLearners.length === 0) {
    return { total: 0, average: 0, highest: 0, lowestCount: 0 };
  }

  const scores = classLearners
    .flatMap(l => Object.values(l.scores || {}))
    .filter(s => typeof s === "number");

  const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestCount = classLearners.filter(l => {
    const avgScore = Object.values(l.scores || {})
      .filter(s => typeof s === "number")
      .reduce((a, b) => a + b, 0) / (Object.keys(l.scores || {}).length || 1);
    return avgScore < 50;
  }).length;

  return {
    total: classLearners.length,
    average,
    highest,
    lowestCount
  };
}

function updateDashboard() {
  const stats = calculateClassStats(activeClassName);
  
  document.getElementById("totalLearners").textContent = stats.total;
  document.getElementById("classAverage").textContent = stats.average + "%";
  document.getElementById("highestAverage").textContent = stats.highest + "%";
  document.getElementById("supportCount").textContent = stats.lowestCount;

  // Subject performance
  const subjects = getSubjectsForClass();
  const subjectBars = document.getElementById("subjectBars");
  subjectBars.innerHTML = subjects
    .map(subject => {
      const classLearners = getClassLearners(activeClassName);
      const scores = classLearners
        .map(l => l.scores?.[subject])
        .filter(s => typeof s === "number");
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;
      return `
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <strong>${subject}</strong>
            <span>${avg}%</span>
          </div>
          <div style="height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${avg}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
          </div>
        </div>
      `;
    })
    .join("");

  // Top learners
  const classLearners = getClassLearners(activeClassName);
  const topLearners = classLearners
    .map(l => {
      const scores = Object.values(l.scores || {}).filter(s => typeof s === "number");
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;
      return { ...l, averageScore: avg };
    })
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5);

  document.getElementById("topLearners").innerHTML = topLearners
    .map(l => `
      <li class="learner-item">
        <span class="learner-name">${l.name} (${l.admission})</span>
        <span class="learner-score">${l.averageScore}%</span>
      </li>
    `)
    .join("");

  // Most improved (mock data)
  const improvedLearners = classLearners.slice(0, 3);
  document.getElementById("improvedLearners").innerHTML = improvedLearners
    .map(l => `
      <li class="learner-item">
        <span class="learner-name">${l.name}</span>
        <span class="learner-score">↑ +5%</span>
      </li>
    `)
    .join("");
}

function updateClassRecords() {
  const classLearners = getClassLearners(activeClassName);
  document.getElementById("selectedClassName").textContent = activeClassName;
  
  document.getElementById("classRoster").innerHTML = classLearners
    .map(l => {
      const scores = Object.values(l.scores || {}).filter(s => typeof s === "number");
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;
      return `
        <li class="learner-item">
          <div>
            <div class="learner-name">${l.name}</div>
            <div style="font-size: 12px; color: #999;">Adm: ${l.admission}</div>
          </div>
          <span class="learner-score">${avg}%</span>
        </li>
      `;
    })
    .join("");
}

function updateReportsView() {
  const subjects = getSubjectsForClass();
  const classLearners = getClassLearners(activeClassName);
  
  const scoreInputs = document.getElementById("scoreInputs");
  scoreInputs.innerHTML = `
    <div class="form-grid" style="grid-template-columns: 1fr;">
      <select id="reportLearner" style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <option value="">Select Learner</option>
        ${classLearners.map(l => `<option value="${l.admission}">${l.name} (${l.admission})</option>`).join("")}
      </select>
    </div>
    <div id="scoringForm"></div>
  `;

  document.getElementById("reportLearner").addEventListener("change", function() {
    const learner = classLearners.find(l => l.admission === this.value);
    if (!learner) {
      document.getElementById("scoringForm").innerHTML = "";
      return;
    }

    const form = document.getElementById("scoringForm");
    form.innerHTML = `
      <h4 style="margin: 20px 0 15px 0; color: #333;">Scores for ${learner.name}</h4>
      <div class="form-grid">
        ${subjects.map(subject => `
          <div>
            <label style="display: block; margin-bottom: 5px; font-size: 13px;">${subject}</label>
            <input type="number" min="0" max="100" value="${learner.scores?.[subject] || ''}" 
                   data-subject="${subject}" data-admission="${learner.admission}" 
                   placeholder="Score" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
          </div>
        `).join("")}
      </div>
      <button type="button" style="margin-top: 15px;" onclick="saveLearnerScores()">Save Scores</button>
    `;
  });
}

function saveLearnerScores() {
  const inputs = document.querySelectorAll("[data-subject][data-admission]");
  const scores = {};
  inputs.forEach(input => {
    scores[input.dataset.subject] = parseInt(input.value) || 0;
  });

  const learner = learners.find(l => l.admission === inputs[0]?.dataset.admission);
  if (learner) {
    learner.scores = scores;
    save("schoolEvalLearners", learners);
    alert("Scores saved successfully!");
    updateDashboard();
  }
}

// ==================== EVENT LISTENERS ====================
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username === "teacher" && password === "password") {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("dashboardContainer").style.display = "flex";
    save("schoolEvalLoggedIn", true);
    loadDashboard();
  } else {
    document.getElementById("loginError").textContent = "Invalid username or password";
  }
});

document.getElementById("logoutBtn").addEventListener("click", function() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("dashboardContainer").style.display = "none";
  localStorage.removeItem("schoolEvalLoggedIn");
});

// Navigation
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    
    const view = this.dataset.view;
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    
    if (view === "dashboard") {
      document.getElementById("dashboardView").classList.add("active");
      updateDashboard();
    } else if (view === "learners") {
      document.getElementById("learnersView").classList.add("active");
      updateClassRecords();
    } else if (view === "reports") {
      document.getElementById("reportsView").classList.add("active");
      updateReportsView();
    } else if (view === "settings") {
      document.getElementById("settingsView").classList.add("active");
    }
  });
});

// Section selector
document.getElementById("sectionSelect").addEventListener("change", function() {
  activeSection = this.value;
  activeClassName = sectionClasses(activeSection)[0] || "Grade 1";
  save("schoolEvalActiveSection", activeSection);
  save("schoolEvalActiveClass", activeClassName);
  
  // Update class selector
  populateClassSelector();
  updateDashboard();
});

// Registration form
document.getElementById("registrationForm").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const newLearner = {
    name: document.getElementById("newLearnerName").value,
    admission: document.getElementById("newLearnerAdmission").value,
    className: document.getElementById("newLearnerClass").value,
    scores: {}
  };

  if (learners.some(l => l.admission === newLearner.admission)) {
    alert("Learner with this admission number already exists!");
    return;
  }

  learners.push(newLearner);
  save("schoolEvalLearners", learners);
  
  alert(`Learner ${newLearner.name} registered successfully!`);
  this.reset();
  updateDashboard();
});

// ==================== INITIALIZATION ====================
function populateClassSelector() {
  const classes = sectionClasses(activeSection);
  const selector = document.getElementById("newLearnerClass");
  selector.innerHTML = '<option value="">Select Class</option>' +
    classes.map(c => `<option value="${c}">${c}</option>`).join("");
}

function loadDashboard() {
  populateClassSelector();
  updateDashboard();
  
  // Add sample data for demo
  if (learners.length === 0) {
    learners = [
      { name: "Amina Wanjiku", admission: "ADM-001", className: "Grade 1", scores: { English: 85, Maths: 78, Kiswahili: 82 } },
      { name: "Brian Otieno", admission: "ADM-002", className: "Grade 1", scores: { English: 92, Maths: 88, Kiswahili: 85 } },
      { name: "Chao Mutiso", admission: "ADM-003", className: "Grade 1", scores: { English: 70, Maths: 65, Kiswahili: 72 } },
      { name: "Diana Kipchoge", admission: "ADM-004", className: "Grade 2", scores: { English: 88, Maths: 91, Kiswahili: 87 } },
    ];
    save("schoolEvalLearners", learners);
    updateDashboard();
  }
}

// Check if logged in
if (load("schoolEvalLoggedIn")) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboardContainer").style.display = "flex";
  loadDashboard();
} else {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("dashboardContainer").style.display = "none";
}
