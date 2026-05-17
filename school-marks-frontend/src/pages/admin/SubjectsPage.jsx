import { useEffect, useState } from 'react';
import { getSubjects } from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';

export default function SubjectsPage() {
  const s = usePageStyles();
  const t = s.tokens;
  const [subjects, setSubjects] = useState([]);

  useEffect(() => { getSubjects().then(r => setSubjects(r.data)); }, []);

  const levels = [
    { key: 'pre_primary',      label: '🟡 Pre-Primary (PP1 & PP2)',     bg: t.warningBg,   border: t.warningText,  itemBg: t.warningBg },
    { key: 'lower_primary',    label: '📗 Lower Primary (Grade 1–3)',    bg: t.successBg,   border: t.successText,  itemBg: t.successBg },
    { key: 'upper_primary',    label: '📘 Upper Primary (Grade 4–6)',    bg: t.infoBg,      border: t.infoText,     itemBg: t.infoBg },
    { key: 'junior_secondary', label: '📙 Junior Secondary (Grade 7–9)', bg: t.accentSubtle, border: t.accent,       itemBg: t.accentSubtle },
  ];

  return (
    <div>
      <h1 style={s.title}>📖 Subjects</h1>
      <div style={{
        fontSize: 14, color: t.textMuted, marginBottom: 24,
        background: t.infoBg, padding: '10px 16px', borderRadius: 8,
        borderLeft: `4px solid ${t.infoText}`,
      }}>
        All CBC subjects are automatically loaded. No manual entry needed.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 20 }}>
        {levels.map(level => {
          const levelSubjects = subjects.filter(sub => sub.levelType === level.key);
          return (
            <div key={level.key} style={{ ...s.card, borderTop: `4px solid ${level.border}` }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 4 }}>{level.label}</h3>
              <div style={{ fontSize: 12, color: t.textFaint, marginBottom: 16 }}>{levelSubjects.length} subjects</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {levelSubjects.map((sub, i) => (
                  <div key={sub.subjectId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8, background: level.itemBg,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, minWidth: 20 }}>{i + 1}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{sub.subjectName}</span>
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