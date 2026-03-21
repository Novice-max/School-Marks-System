import { useEffect, useState } from 'react';
import { getSubjects } from '../../api/client';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => { getSubjects().then(r => setSubjects(r.data)); }, []);

  const levels = [
    { key: 'lower_primary',    label: '📗 Lower Primary (Grade 1–3)',    color: '#dcfce7', border: '#16a34a' },
    { key: 'upper_primary',    label: '📘 Upper Primary (Grade 4–6)',    color: '#dbeafe', border: '#2563eb' },
    { key: 'junior_secondary', label: '📙 Junior Secondary (Grade 7–9)', color: '#f3e8ff', border: '#7c3aed' },
  ];

  return (
    <div>
      <h1 style={s.title}>📖 Subjects</h1>
      <div style={s.note}>
        All CBC subjects are automatically loaded. No manual entry needed.
      </div>

      <div style={s.grid}>
        {levels.map(level => {
          const levelSubjects = subjects.filter(sub => sub.levelType === level.key);
          return (
            <div key={level.key} style={{ ...s.card, borderTop: `4px solid ${level.border}` }}>
              <h3 style={s.levelTitle}>{level.label}</h3>
              <div style={s.count}>{levelSubjects.length} subjects</div>
              <div style={s.subjectList}>
                {levelSubjects.map((sub, i) => (
                  <div key={sub.subjectId} style={{ ...s.subjectItem, background: level.color }}>
                    <span style={s.subjectNum}>{i + 1}</span>
                    <span style={s.subjectName}>{sub.subjectName}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  title:       { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 },
  note:        { fontSize: 14, color: '#888', marginBottom: 24, background: '#f8fafc', padding: '10px 16px', borderRadius: 8, borderLeft: '4px solid #3b82f6' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 20 },
  card:        { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  levelTitle:  { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 },
  count:       { fontSize: 12, color: '#888', marginBottom: 16 },
  subjectList: { display: 'flex', flexDirection: 'column', gap: 8 },
  subjectItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8 },
  subjectNum:  { fontSize: 12, fontWeight: 700, color: '#666', minWidth: 20 },
  subjectName: { fontSize: 14, fontWeight: 500, color: '#1e3a5f' },
};
