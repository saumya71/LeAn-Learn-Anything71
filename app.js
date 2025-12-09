// Global State
let allCourses = [];
let savedCourseIds = JSON.parse(localStorage.getItem('lean_saved_courses')) || [];
let currentTheme = localStorage.getItem('lean_theme') || 'light';

// Constants
const DATA_URL = 'courses.json';

// DOM Elements
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');

/**
 * Initialize the App
 */
async function init() {
  // Apply theme immediately
  setTheme(currentTheme);

  // Load data
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Failed to load courses');
    allCourses = await response.json();
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback if fetch fails (e.g. file:// protocol restriction in some browsers)
    // In a real scenario, we'd show an error message.
    const grid = document.getElementById('course-grid');
    if(grid) grid.innerHTML = `<p style="text-align:center; padding: 2rem;">Error loading courses. If you are opening this file directly, please use a local server or browser that allows local file fetch.<br>Details: ${error.message}</p>`;
    return;
  }

  // Determine which page we are on
  const path = window.location.pathname;
  const isDetailPage = path.includes('course.html');

  if (isDetailPage) {
    initDetailPage();
  } else {
    initHomePage();
  }

  // Common Events
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
    });
  }
}

/**
 * Set Theme
 * @param {string} theme 'light' or 'dark'
 */
function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('lean_theme', theme);

  if (theme === 'dark') {
    body.classList.add('theme-dark');
    if (themeToggle) themeToggle.innerText = '☀️ Light Mode';
  } else {
    body.classList.remove('theme-dark');
    if (themeToggle) themeToggle.innerText = '🌙 Dark Mode';
  }
}

/**
 * Home Page Logic
 */
function initHomePage() {
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-select');
  const libBtn = document.getElementById('library-btn');
  const homeBtn = document.getElementById('home-btn'); // optional if we implement tabs
  const pageTitle = document.getElementById('page-title');

  // Check if we want to show Library view
  const urlParams = new URLSearchParams(window.location.search);
  const showLibrary = urlParams.get('view') === 'library';

  if (showLibrary) {
    pageTitle.innerText = 'My Library';
    if(libBtn) {
      libBtn.innerText = 'Browse Courses';
      libBtn.onclick = (e) => {
        e.preventDefault();
        window.location.href = 'index.html';
      };
    }
  } else {
     if(libBtn) {
       libBtn.onclick = (e) => {
         e.preventDefault();
         window.location.href = 'index.html?view=library';
       }
     }
  }

  // Render initially
  renderCourses(allCourses, showLibrary);

  // Filter Listeners
  const handleFilter = () => {
    const query = searchInput.value.toLowerCase();
    const category = categorySelect.value;

    const filtered = allCourses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(query) ||
                            course.short_description.toLowerCase().includes(query);
      const matchesCategory = category === 'All' || course.category === category;
      return matchesSearch && matchesCategory;
    });

    renderCourses(filtered, showLibrary);
  };

  if (searchInput) searchInput.addEventListener('input', handleFilter);
  if (categorySelect) categorySelect.addEventListener('change', handleFilter);
}

/**
 * Render Course Grid
 * @param {Array} courses List of courses to render
 * @param {Boolean} onlySaved If true, filter by saved IDs
 */
function renderCourses(courses, onlySaved = false) {
  const grid = document.getElementById('course-grid');
  if (!grid) return;

  grid.innerHTML = '';

  let coursesToShow = courses;
  if (onlySaved) {
    coursesToShow = courses.filter(c => savedCourseIds.includes(c.id));
  }

  if (coursesToShow.length === 0) {
    grid.innerHTML = '<p style="text-align:center; width:100%;">No courses found.</p>';
    return;
  }

  coursesToShow.forEach(course => {
    const isSaved = savedCourseIds.includes(course.id);

    const card = document.createElement('article');
    card.className = 'course-card';

    card.innerHTML = `
      <img src="${course.thumbnail_url}" alt="${course.title}" class="card-thumb">
      <div class="card-content">
        <span class="card-source">${course.source_name}</span>
        <h3 class="card-title">${course.title}</h3>
        <div class="card-meta">
          <span>${course.level}</span> •
          <span>${course.language}</span>
        </div>
        <div class="card-actions">
          <a href="course.html?id=${course.id}" class="btn-primary">View Details</a>
          <button class="btn-save ${isSaved ? 'saved' : ''}" onclick="toggleSave('${course.id}')" title="${isSaved ? 'Unsave' : 'Save'}">
            ${isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/**
 * Detail Page Logic
 */
function initDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('id');
  const course = allCourses.find(c => c.id === courseId);

  if (!course) {
    document.querySelector('main').innerHTML = '<p>Course not found.</p>';
    return;
  }

  renderDetailView(course);
}

/**
 * Render Detail View
 * @param {Object} course
 */
function renderDetailView(course) {
  // Fill Info
  document.getElementById('course-title').innerText = course.title;
  document.getElementById('course-source').innerText = course.source_name;
  document.getElementById('course-desc').innerText = course.full_description;
  document.getElementById('course-meta').innerText = `${course.category} • ${course.level} • ${course.duration_text}`;

  // Save Button State
  const saveBtn = document.getElementById('detail-save-btn');
  const isSaved = savedCourseIds.includes(course.id);
  updateDetailSaveBtn(saveBtn, isSaved);

  saveBtn.onclick = () => {
    toggleSave(course.id);
    const newIsSaved = savedCourseIds.includes(course.id);
    updateDetailSaveBtn(saveBtn, newIsSaved);
  };

  // Render Lectures
  const lectureList = document.getElementById('lecture-list');
  lectureList.innerHTML = '';

  course.lectures.forEach((lecture, index) => {
    const li = document.createElement('li');
    li.className = 'lecture-item';
    li.innerHTML = `
      <span class="lecture-title">${index + 1}. ${lecture.title}</span>
      <span class="lecture-duration">${lecture.duration_text || ''}</span>
    `;

    li.onclick = () => playLecture(lecture.video_id, li);
    lectureList.appendChild(li);

    // Auto-load first lecture
    if (index === 0) {
      playLecture(lecture.video_id, li);
    }
  });
}

function updateDetailSaveBtn(btn, isSaved) {
  btn.innerHTML = isSaved ? '★ Saved' : '☆ Save to Library';
  btn.classList.toggle('saved', isSaved);
}

/**
 * Play Lecture
 * @param {string} videoId
 * @param {HTMLElement} listItem
 */
function playLecture(videoId, listItem) {
  const iframe = document.getElementById('video-player');
  // Use embed URL
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  // Update UI active state
  document.querySelectorAll('.lecture-item').forEach(item => item.classList.remove('active'));
  if (listItem) listItem.classList.add('active');
}

/**
 * Toggle Save Course
 * @param {string} courseId
 */
function toggleSave(courseId) {
  const index = savedCourseIds.indexOf(courseId);
  if (index === -1) {
    savedCourseIds.push(courseId);
  } else {
    savedCourseIds.splice(index, 1);
  }
  localStorage.setItem('lean_saved_courses', JSON.stringify(savedCourseIds));

  // Re-render if on home page
  const grid = document.getElementById('course-grid');
  if (grid) {
    // Check if we are in library view
    const urlParams = new URLSearchParams(window.location.search);
    const showLibrary = urlParams.get('view') === 'library';
    renderCourses(allCourses, showLibrary);
  }
}

// Global scope required for onclick handlers in HTML
window.toggleSave = toggleSave;
window.init = init;

// Run init on load
document.addEventListener('DOMContentLoaded', init);
