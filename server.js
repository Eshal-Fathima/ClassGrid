/**
 * ClassGrid — Express server. All pages server-rendered with EJS. No JSON APIs.
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COOKIE_PROFILE = 'profileId';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function getProfileIdFromCookie(req) {
  const c = req.headers.cookie || '';
  const m = c.match(new RegExp(COOKIE_PROFILE + '=([^;]+)'));
  return m ? parseInt(m[1], 10) : null;
}

function setProfileCookie(res, profileId) {
  res.setHeader('Set-Cookie', COOKIE_PROFILE + '=' + profileId + '; Max-Age=' + COOKIE_MAX_AGE + '; Path=/; HttpOnly');
}

function clearProfileCookie(res) {
  res.setHeader('Set-Cookie', COOKIE_PROFILE + '=; Max-Age=0; Path=/; HttpOnly');
}

/** Get current profile from cookie or null */
async function getProfile(req) {
  const id = getProfileIdFromCookie(req);
  if (!id) return null;
  const [rows] = await pool.query('SELECT * FROM UserProfile WHERE id = ?', [id]);
  return rows[0] || null;
}

/** Redirect to setup if no profile */
function requireProfile(fn) {
  return async (req, res) => {
    const profile = await getProfile(req);
    if (!profile) return res.redirect('/setup');
    req.profile = profile;
    return fn(req, res);
  };
}

// ----- Setup -----
// ===== Setup =====

app.get('/setup', async (req, res) => {
  if (await getProfile(req)) return res.redirect('/');
  res.render('setup', { profile: null, error: null });
});

app.post('/setup', async (req, res) => {
  const name = (req.body.name || '').trim();
  const reg_id = (req.body.reg_id || '').trim();
  const semester = (req.body.semester || '').trim();

  if (!name || !reg_id) {
    return res.render('setup', {
      profile: null,
      error: 'Name and Registration ID are required',
    });
  }

  // Check if user already exists
  const [rows] = await pool.query(
    'SELECT id FROM UserProfile WHERE reg_id = ?',
    [reg_id]
  );

  let userId;

  if (rows.length > 0) {
    // Reuse existing user
    userId = rows[0].id;

    await pool.query(
      'UPDATE UserProfile SET name = ?, semester = ? WHERE id = ?',
      [name, semester || null, userId]
    );
  } else {
    // Create new user
    const [result] = await pool.query(
      'INSERT INTO UserProfile (name, reg_id, semester) VALUES (?, ?, ?)',
      [name, reg_id, semester || null]
    );
    userId = result.insertId;
  }

  // Store user in session / cookie
  setProfileCookie(res, userId);

  res.redirect('/');
});

// ===== Logout =====

app.get('/logout', (req, res) => {
  clearProfileCookie(res);
  res.redirect('/setup');
});

// ----- Dashboard -----
app.get('/', requireProfile(async (req, res) => {
  const profile = req.profile;
  const [rulesRow] = await pool.query('SELECT * FROM AttendanceRule WHERE user_profile_id = ?', [profile.id]);
  const rules = rulesRow[0] || null;

  const [entries] = await pool.query(
    `SELECT t.day, t.period, s.name AS subject_name FROM Timetable t
     JOIN Subject s ON t.subject_id = s.id WHERE t.user_profile_id = ? ORDER BY t.day, t.period`,
    [profile.id]
  );
  const grid = {};
  entries.forEach(e => { grid[`${e.day}-${e.period}`] = e.subject_name; });

  const periods = [1, 2, 3, 4, 5, 6, 7, 8];
  const gridRows = periods.map(p => DAYS.map(d => grid[`${d}-${p}`] || ''));

  const [subjects] = await pool.query('SELECT * FROM Subject WHERE user_profile_id = ?', [profile.id]);
  const [attendance] = await pool.query(
    'SELECT a.*, s.name FROM Attendance a JOIN Subject s ON a.subject_id = s.id WHERE s.user_profile_id = ?',
    [profile.id]
  );
  const minPct = rules ? rules.minimum_percentage : 75;
  const totals = {};
  subjects.forEach(s => { totals[s.id] = { total: 0, attended: 0, missed: 0, name: s.name }; });
  const [ttCount] = await pool.query(
    'SELECT subject_id, COUNT(*) AS c FROM Timetable WHERE user_profile_id = ? GROUP BY subject_id',
    [profile.id]
  );
  ttCount.forEach(r => { if (totals[r.subject_id]) totals[r.subject_id].total = r.c; });
  attendance.forEach(r => {
    if (r.status === 'holiday' || r.status === 'exam') return;
    if (!totals[r.subject_id]) return;
    if (r.status === 'attended') totals[r.subject_id].attended++;
    else totals[r.subject_id].missed++;
  });
  const summary = Object.entries(totals).map(([sid, o]) => {
    const eff = o.attended + o.missed;
    const pct = eff ? (o.attended / eff * 100) : 0;
    let safe = 0;
    while (eff + safe > 0 && (o.attended / (eff + safe) * 100) >= minPct) safe++;
    return { ...o, subject_id: sid, percentage: pct.toFixed(1), safeToMiss: Math.max(0, safe - 1) };
  });

  const examDates = [...new Set(attendance.filter(a => a.status === 'exam').map(a => a.date.toString()))].sort();

  res.render('dashboard', {
    profile,
    rules,
    dayNames: DAYS,
    gridRows,
    summary,
    examDates,
    saved: req.query.saved,
  });
}));

// ----- Timetable -----
app.get('/timetable', requireProfile(async (req, res) => {
  const profile = req.profile;
  const [entries] = await pool.query(
    `SELECT t.day, t.period, s.name AS subject_name FROM Timetable t
     JOIN Subject s ON t.subject_id = s.id WHERE t.user_profile_id = ?`,
    [profile.id]
  );
  const grid = {};
  entries.forEach(e => { grid[`${e.day}-${e.period}`] = e.subject_name; });
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const editRows = periods.map(p => ({ period: p, cells: DAYS.map((d, i) => ({ dayIdx: i, dayName: d, value: grid[`${d}-${p}`] || '' })) }));
  res.render('timetable', { profile, dayNames: DAYS, editRows });
}));

app.post('/timetable', requireProfile(async (req, res) => {
  const profile = req.profile;
  await pool.query('DELETE FROM Timetable WHERE user_profile_id = ?', [profile.id]);
  const subjectCache = {};
  for (let dayIdx = 0; dayIdx < DAYS.length; dayIdx++) {
    for (let period = 1; period <= 10; period++) {
      const name = (req.body[`cell_${dayIdx}_${period}`] || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!subjectCache[key]) {
        const [ex] = await pool.query('SELECT id FROM Subject WHERE user_profile_id = ? AND LOWER(name) = ?', [profile.id, key]);
        let sid;
        if (ex.length) sid = ex[0].id;
        else {
          const [ins] = await pool.query('INSERT INTO Subject (user_profile_id, name, total_hours) VALUES (?, ?, 0)', [profile.id, name]);
          sid = ins.insertId;
        }
        subjectCache[key] = sid;
      }
      await pool.query('INSERT INTO Timetable (user_profile_id, day, period, subject_id) VALUES (?, ?, ?, ?)',
        [profile.id, DAYS[dayIdx], period, subjectCache[key]]);
    }
  }
  await pool.query(
    'UPDATE Subject s SET total_hours = (SELECT COUNT(*) FROM Timetable t WHERE t.subject_id = s.id) WHERE s.user_profile_id = ?',
    [profile.id]
  );
  res.redirect('/?saved=timetable');
}));

// ----- Attendance -----
app.get('/attendance', requireProfile(async (req, res) => {
  const profile = req.profile;
  const [subjects] = await pool.query('SELECT * FROM Subject WHERE user_profile_id = ? ORDER BY name', [profile.id]);
  const [recent] = await pool.query(
    `SELECT a.date, a.status, s.name FROM Attendance a JOIN Subject s ON a.subject_id = s.id
     WHERE s.user_profile_id = ? ORDER BY a.date DESC LIMIT 30`,
    [profile.id]
  );
  res.render('attendance', { profile, subjects, recent, saved: req.query.saved });
}));

app.post('/attendance', requireProfile(async (req, res) => {
  const profile = req.profile;
  const date = req.body.date;
  const subjectId = req.body.subject_id;
  const status = req.body.status;
  if (!date || !subjectId || !['attended', 'missed', 'holiday', 'exam'].includes(status)) {
    return res.redirect('/attendance');
  }
  const [sub] = await pool.query('SELECT id FROM Subject WHERE id = ? AND user_profile_id = ?', [subjectId, profile.id]);
  if (!sub.length) return res.redirect('/attendance');
  await pool.query(
    'INSERT INTO Attendance (date, subject_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)',
    [date, subjectId, status]
  );
  res.redirect('/attendance?saved=1');
}));

// ----- Rules -----
app.get('/rules', requireProfile(async (req, res) => {
  const profile = req.profile;
  const [rows] = await pool.query('SELECT * FROM AttendanceRule WHERE user_profile_id = ?', [profile.id]);
  const rules = rows[0] || null;
  res.render('rules', { profile, rules });
}));

app.post('/rules', requireProfile(async (req, res) => {
  const profile = req.profile;
  const minPct = parseInt(req.body.minimum_percentage, 10) || 75;
  const start = req.body.semester_start;
  const end = req.body.semester_end;
  if (!start || !end || minPct < 1 || minPct > 100) return res.redirect('/rules');
  await pool.query(
    `INSERT INTO AttendanceRule (user_profile_id, minimum_percentage, semester_start, semester_end)
     VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE minimum_percentage=?, semester_start=?, semester_end=?`,
    [profile.id, minPct, start, end, minPct, start, end]
  );
  res.redirect('/?saved=rules');
}));

// Expose profile for layout in all views
app.use(async (req, res, next) => {
  try { res.locals.profile = await getProfile(req); } catch (_) { res.locals.profile = null; }
  next();
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log('ClassGrid running at http://localhost:' + PORT));
  })
  .catch(err => {
    console.error('DB init failed:', err.message);
    process.exit(1);
  });

app.post('/attendance/setup', async (req, res) => {
  const profile = await getProfile(req);
  if (!profile) return res.redirect('/setup');

  const [subjects] = await pool.query(
    'SELECT id FROM Subject WHERE user_profile_id = ?',
    [profile.id]
  );

  for (const s of subjects) {
    const total = parseInt(req.body[`total_${s.id}`] || 0);
    const conducted = parseInt(req.body[`conducted_${s.id}`] || 0);
    const attended = parseInt(req.body[`attended_${s.id}`] || 0);

    await pool.query(`
      UPDATE Subject
      SET total_hours = ?, conducted_hours = ?, attended_hours = ?
      WHERE id = ?
    `, [total, conducted, attended, s.id]);
  }

  res.redirect('/attendance');
});
