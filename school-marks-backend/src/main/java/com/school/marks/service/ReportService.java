package com.school.marks.service;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.*;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import com.school.marks.dto.StudentMarkSummaryDTO;
import com.school.marks.dto.SubjectMarkDTO;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final MarkService markService;
    private final ExamRepository examRepository;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final SubjectRepository subjectRepository;

    private static final DeviceRgb HEADER_COLOR    = new DeviceRgb(30,  90,  160);
    private static final DeviceRgb ALT_ROW_COLOR   = new DeviceRgb(240, 245, 255);
    private static final DeviceRgb TABLE_HEADER_BG = new DeviceRgb(200, 215, 235);
    private static final DeviceRgb TOTAL_ROW_BG    = new DeviceRgb(210, 225, 245);
    private static final DeviceRgb EE_COLOR        = new DeviceRgb(0,   150, 70);
    private static final DeviceRgb ME_COLOR        = new DeviceRgb(60,  130, 200);
    private static final DeviceRgb AE_COLOR        = new DeviceRgb(220, 150, 0);
    private static final DeviceRgb BE_COLOR        = new DeviceRgb(200, 50,  50);

    // ──────────────────────────────────────────────────────────────
    // CLASS MARKLIST PDF
    // ──────────────────────────────────────────────────────────────
    public byte[] generateClassMarklistPdf(Long examId) throws Exception {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
        List<StudentMarkSummaryDTO> marklist = markService.getClassMarkList(examId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        pdf.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4.rotate());
        Document doc = new Document(pdf);
        doc.setMargins(30, 30, 30, 30);

        PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

        addSchoolHeader(doc, bold, regular);
        doc.add(new Paragraph(exam.getClassRoom().getDisplayName() + " — "
                + exam.getExamName() + " | Term " + exam.getTerm() + " | " + exam.getAcademicYear())
                .setFont(regular).setFontSize(11).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(" "));

        if (marklist.isEmpty()) {
            doc.add(new Paragraph("No marks entered for this exam.").setFont(regular).setFontSize(11));
            doc.close();
            return baos.toByteArray();
        }

        List<SubjectMarkDTO> sampleSubjects = marklist.get(0).getSubjectMarks();
        int colCount = 3 + sampleSubjects.size() + 3;
        Table table = new Table(UnitValue.createPercentArray(colCount)).setWidth(UnitValue.createPercentValue(100));

        for (String h : new String[]{"#", "Admission No.", "Student Name"}) addHeaderCell(table, h, bold);
        for (SubjectMarkDTO s : sampleSubjects) addHeaderCell(table, s.getSubjectName(), bold);
        for (String h : new String[]{"Total", "Average", "Overall"}) addHeaderCell(table, h, bold);

        boolean alt = false;
        for (StudentMarkSummaryDTO student : marklist) {
            DeviceRgb rowColor = alt ? ALT_ROW_COLOR : null;
            addCell(table, String.valueOf(student.getPosition()), regular, rowColor);
            addCell(table, student.getAdmissionNumber(), regular, rowColor);
            addCell(table, student.getFullName(), regular, rowColor);

            double totalPoints = 0; int subjectCount = 0;
            for (SubjectMarkDTO sm : student.getSubjectMarks()) {
                if (sm.getScore() != null) {
                    Cell cell = new Cell().add(new Paragraph(sm.getScore().toPlainString()).setFont(regular).setFontSize(9))
                            .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE);
                    if (rowColor != null) cell.setBackgroundColor(rowColor);
                    if (sm.getGrade() != null) cell.setFontColor(getGradeColor(sm.getGrade()));
                    table.addCell(cell);
                    totalPoints += sm.getScore().doubleValue(); subjectCount++;
                } else { addCell(table, "-", regular, rowColor); }
            }

            double avg = counted > 0 ? BigDecimal.valueOf(totalPoints / counted)
                    .setScale(2, RoundingMode.HALF_UP).doubleValue() : 0;
            String overallGrade = getSimpleCbcGrade(avg, exam.getClassRoom().getGradeLevel());
            addCell(table, String.format("%.1f", totalPoints), regular, rc, cf);
            addCell(table, String.format("%.2f", avg), regular, rc, cf);
            Cell gc = new Cell().add(new Paragraph(overallGrade).setFont(bold).setFontSize(cf))
                    .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setFontColor(getGradeColor(overallGrade));
            if (rowColor != null) gradeCell.setBackgroundColor(rowColor);
            table.addCell(gradeCell);
            alt = !alt;
        }
        doc.add(table);
        double classAvg = marklist.stream().mapToDouble(s -> s.getAverage() != null ? s.getAverage() : 0).average().orElse(0);
        doc.add(new Paragraph("Class Average: " + BigDecimal.valueOf(classAvg).setScale(2, RoundingMode.HALF_UP)
                + "  |  Total Students: " + marklist.size()).setFont(bold).setFontSize(10).setFontColor(HEADER_COLOR));
        doc.close();
        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────
    // LEGACY SINGLE-EXAM MARKSHEET PDF
    // ──────────────────────────────────────────────────────────────
    public byte[] generateStudentMarksheetPdf(Long studentId, Long examId) throws Exception {
        Exam exam = examRepository.findById(examId).orElseThrow(() -> new RuntimeException("Exam not found"));
        Student student = studentRepository.findById(studentId).orElseThrow(() -> new RuntimeException("Student not found"));
        List<StudentMarkSummaryDTO> marklist = markService.getClassMarkList(examId);
        StudentMarkSummaryDTO studentData = marklist.stream().filter(s -> s.getStudentId().equals(studentId))
                .findFirst().orElseThrow(() -> new RuntimeException("No marks found for this student"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf);
        doc.setMargins(36, 36, 36, 36);

        PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
        PdfFont italic  = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_OBLIQUE);

        buildReportHeader(doc, bold, regular, italic);

        doc.add(new Paragraph("SCHOOL BASED TERM " + exam.getTerm() + " ASSESSMENT REPORT YEAR " + exam.getAcademicYear())
                .setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.CENTER)
                .setBorder(new SolidBorder(ColorConstants.BLACK, 1.5f)).setPadding(5).setMarginTop(8));

        int gl = exam.getClassRoom().getGradeLevel();
        String levelLabel = getLevelLabel(gl);
        if (!levelLabel.isEmpty())
            doc.add(new Paragraph(levelLabel).setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.CENTER).setMarginTop(2));

        String gradeLabel = gl == -1 ? "PP1" : gl == 0 ? "PP2" : "GRADE " + gl;
        buildNameGradeRow(doc, bold, student.getFullName(), gradeLabel);

        String examNameLower = exam.getExamName().toLowerCase();
        boolean isMidTerm = examNameLower.contains("mid") || examNameLower.contains("opener");
        boolean isEndTerm = examNameLower.contains("end");

        int subjectTotal = studentData.getSubjectMarks().size();
        float rowH = rowHeight(subjectTotal); float bodyF = bodyFont(subjectTotal); float hdrF = headerFont(subjectTotal);

        Table marksTable = buildTableHeader(bodyF, hdrF);

        double totalScore = 0; int subjectCount = 0; boolean alt = false;
        for (SubjectMarkDTO sm : studentData.getSubjectMarks()) {
            DeviceRgb rb = alt ? ALT_ROW_COLOR : null;
            String ss = sm.getScore() != null ? sm.getScore().toPlainString() : "";
            double sv = sm.getScore() != null ? sm.getScore().doubleValue() : 0;
            String lv = sm.getScore() != null ? getDetailedGrade(sv) : "";

            addMarkCell(marksTable, sm.getSubjectName(), regular, bodyF, rowBg, TextAlignment.LEFT, rowH);
            if (isMidTerm) {
                addMarkCell(marksTable, scoreStr, regular, bodyF,     rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, level,    bold,    bodyF - 1, rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, "",        regular, bodyF,    rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, "",        regular, bodyF - 1,rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, scoreStr, regular, bodyF,     rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, level,    bold,    bodyF - 1, rowBg, TextAlignment.CENTER, rowH);
            } else if (isEndTerm) {
                addMarkCell(marksTable, "",        regular, bodyF,     rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, "",        regular, bodyF - 1, rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, scoreStr, regular, bodyF,     rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, level,    bold,    bodyF - 1, rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, scoreStr, regular, bodyF,     rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, level,    bold,    bodyF - 1, rowBg, TextAlignment.CENTER, rowH);
            } else {
                addMarkCell(marksTable, scoreStr, regular, bodyF,     rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, level,    bold,    bodyF - 1, rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, scoreStr, regular, bodyF,     rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, level,    bold,    bodyF - 1, rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, scoreStr, regular, bodyF,     rowBg, TextAlignment.CENTER, rowH);
                addMarkCell(marksTable, level,    bold,    bodyF - 1, rowBg, TextAlignment.CENTER, rowH);
            }
            if (sm.getScore() != null) { totalScore += score; subjectCount++; }
            alt = !alt;
        }

        double av = sc > 0 ? ts / sc : 0;
        String tstr = sc > 0 ? String.format("%.0f", ts) : "";
        String astr = sc > 0 ? String.format("%.1f", av) : "";
        String alvl = sc > 0 ? getDetailedGrade(av) : "";

        marksTable.addCell(new Cell().add(new Paragraph("TOTAL").setFont(bold).setFontSize(bodyF))
                .setBackgroundColor(TOTAL_ROW_BG).setPadding(6).setMinHeight(rowH));
        if (isMidTerm) {
            addMarkCell(marksTable, totalStr, bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, "",       bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, "",       bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, "",       bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, avgStr,   bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, avgLevel, bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
        } else if (isEndTerm) {
            addMarkCell(marksTable, "",       bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, "",       bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, totalStr, bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, "",       bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, avgStr,   bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, avgLevel, bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
        } else {
            addMarkCell(marksTable, totalStr, bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, "",       bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, totalStr, bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, "",       bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, avgStr,   bold, bodyF,     TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
            addMarkCell(marksTable, avgLevel, bold, bodyF - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowH);
        }
        doc.add(marksTable);

        buildRubric(doc, bold, regular);
        doc.add(new Paragraph("FACILITATOR'S COMMENT:  " + generateFacilitatorComment(student.getFirstName(), avgLevel, gl))
                .setFont(regular).setFontSize(9).setMarginTop(8));
        buildSignatures(doc, bold, regular);
        buildDates(doc, regular);

        doc.close();
        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────
    // COMBINED TERM REPORT CARD (Mid-Term + End-Term in one PDF)
    // ──────────────────────────────────────────────────────────────
    public byte[] generateTermReportPdf(Long studentId, Long classId, Integer term, String academicYear) throws Exception {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Class not found"));

        List<Exam> allExams = examRepository.findByClassRoom_ClassIdAndTermAndAcademicYear(classId, term, academicYear);

        java.util.Optional<Exam> midExamOpt = allExams.stream()
                .filter(e -> e.getExamName().toLowerCase().contains("opener") || e.getExamName().toLowerCase().contains("mid"))
                .findFirst();
        java.util.Optional<Exam> endExamOpt = allExams.stream()
                .filter(e -> e.getExamName().toLowerCase().contains("end"))
                .findFirst();

        if (midExamOpt.isEmpty() && endExamOpt.isEmpty())
            throw new RuntimeException("No exams found for Term " + term + " " + academicYear);

        java.util.Map<String, BigDecimal> midMarks = new java.util.HashMap<>();
        java.util.Map<String, BigDecimal> endMarks = new java.util.HashMap<>();

        if (midExamOpt.isPresent()) {
            markService.getClassMarkList(midExamOpt.get().getExamId()).stream()
                .filter(s -> s.getStudentId().equals(studentId)).findFirst()
                .ifPresent(sd -> sd.getSubjectMarks().forEach(sm -> { if (sm.getScore() != null) midMarks.put(sm.getSubjectName(), sm.getScore()); }));
        }
        if (endExamOpt.isPresent()) {
            markService.getClassMarkList(endExamOpt.get().getExamId()).stream()
                .filter(s -> s.getStudentId().equals(studentId)).findFirst()
                .ifPresent(sd -> sd.getSubjectMarks().forEach(sm -> { if (sm.getScore() != null) endMarks.put(sm.getSubjectName(), sm.getScore()); }));
        }

        List<Subject> subjects = subjectRepository.findByLevelType(classRoom.getLevelType());

        // ── Calculate subject count first for margin computation ──
        int subjectTotal = subjects.size();
        float rowH  = rowHeight(subjectTotal);
        float bodyF = bodyFont(subjectTotal);
        float hdrF  = headerFont(subjectTotal);

        int gl = classRoom.getGradeLevel();
        String levelLabel = getLevelLabel(gl);

        // ── Compute margins to guarantee one-page fit ──
        float contentHeight = 70 + 30 + (levelLabel.isEmpty() ? 0 : 15) + 20 + 40
                + (subjectTotal * rowH) + rowH + 10 + 40 + 20 + 40 + 25;
        float pageHeight = 842f;
        float availableMargin = Math.max((pageHeight - contentHeight) / 2f, 18f);
        float topMargin    = Math.min(availableMargin, 36f);
        float bottomMargin = Math.min(availableMargin, 36f);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf);
        doc.setMargins(topMargin, 36, bottomMargin, 36);

        PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
        PdfFont italic  = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_OBLIQUE);

        buildReportHeader(doc, bold, regular, italic);

        doc.add(new Paragraph("SCHOOL BASED TERM " + term + " ASSESSMENT REPORT YEAR " + academicYear)
                .setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.CENTER)
                .setBorder(new SolidBorder(ColorConstants.BLACK, 1.5f)).setPadding(5).setMarginTop(8));

        if (!levelLabel.isEmpty())
            doc.add(new Paragraph(levelLabel).setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.CENTER).setMarginTop(2));

        String gradeLabel = gl == -1 ? "PP1" : gl == 0 ? "PP2" : "GRADE " + gl;
        buildNameGradeRow(doc, bold, student.getFullName(), gradeLabel);

        Table marksTable = buildTableHeader(bodyF, hdrF);

        boolean alt = false;
        double totalMid = 0, totalEnd = 0, totalAvg = 0;
        int midCount = 0, endCount = 0;

        for (Subject sub : subjects) {
            DeviceRgb rb = alt ? ALT_ROW_COLOR : null;
            addMarkCell(mt, sub.getSubjectName(), regular, bf, rb, TextAlignment.LEFT, rh);
            double sA = 0; int sN = 0;
            for (int i = 0; i < slots.size(); i++) {
                BigDecimal score = slots.get(i).marks.get(sub.getSubjectName());
                addMarkCell(mt, score!=null?score.toPlainString():"", regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, score!=null?getDetailedGrade(score.doubleValue()):"", bold, bf-1, rb, TextAlignment.CENTER, rh);
                if (score!=null) { sTotals[i]+=score.doubleValue(); sCounts[i]++; sA+=score.doubleValue(); sN++; }
            }
            if (sN>0) { double a=sA/sN; addMarkCell(mt,String.format("%.1f",a),regular,bf,rb,TextAlignment.CENTER,rh); addMarkCell(mt,getDetailedGrade(a),bold,bf-1,rb,TextAlignment.CENTER,rh); tAvg+=a; aC++; }
            else { addMarkCell(mt,"",regular,bf,rb,TextAlignment.CENTER,rh); addMarkCell(mt,"",bold,bf-1,rb,TextAlignment.CENTER,rh); }
            alt = !alt;
        }

        mt.addCell(new Cell().add(new Paragraph("TOTAL").setFont(bold).setFontSize(bf)).setBackgroundColor(TOTAL_ROW_BG).setPadding(4).setMinHeight(rh));
        for (int i=0;i<slots.size();i++) { addMarkCell(mt,sCounts[i]>0?String.format("%.0f",sTotals[i]):"",bold,bf,TOTAL_ROW_BG,TextAlignment.CENTER,rh); addMarkCell(mt,"",bold,bf-1,TOTAL_ROW_BG,TextAlignment.CENTER,rh); }
        double oAvg = aC>0?tAvg/aC:0;
        addMarkCell(mt,aC>0?String.format("%.1f",oAvg):"",bold,bf,TOTAL_ROW_BG,TextAlignment.CENTER,rh);
        addMarkCell(mt,aC>0?getDetailedGrade(oAvg):"",bold,bf-1,TOTAL_ROW_BG,TextAlignment.CENTER,rh);

        doc.add(marksTable);
        buildRubric(doc, bold, regular);
        doc.add(new Paragraph("FACILITATOR'S COMMENT:  "+generateFacilitatorComment(student.getFirstName(),aC>0?getDetailedGrade(oAvg):"ME1",gl)).setFont(regular).setFontSize(9).setMarginTop(8));
        buildSignatures(doc, bold, regular);
        buildDates(doc, regular);

        doc.close();
        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────
    // ALL TERM REPORT CARDS FOR A CLASS (one PDF, one student per page)
    // Pre-fetches all data once — 5 queries total instead of 125+
    // ──────────────────────────────────────────────────────────────
    public byte[] generateAllTermReportsPdf(Long classId, Integer term, String academicYear) throws Exception {
        // ── 1. Pre-fetch ALL shared data once ──
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Class not found"));

        List<Student> students = studentRepository.findByClassRoom_ClassIdAndIsActiveTrue(classId);
        if (students.isEmpty()) throw new RuntimeException("No active students in this class");

        students.sort((a, b) -> {
            int cmp = a.getLastName().compareToIgnoreCase(b.getLastName());
            return cmp != 0 ? cmp : a.getFirstName().compareToIgnoreCase(b.getFirstName());
        });

        List<Subject> subjects = subjectRepository.findByLevelType(classRoom.getLevelType());
        int subjectTotal = subjects.size();

        List<Exam> allExams = examRepository.findByClassRoom_ClassIdAndTermAndAcademicYear(classId, term, academicYear);
        java.util.Optional<Exam> midExamOpt = allExams.stream()
                .filter(e -> e.getExamName().toLowerCase().contains("opener") || e.getExamName().toLowerCase().contains("mid"))
                .findFirst();
        java.util.Optional<Exam> endExamOpt = allExams.stream()
                .filter(e -> e.getExamName().toLowerCase().contains("end"))
                .findFirst();

        if (midExamOpt.isEmpty() && endExamOpt.isEmpty())
            throw new RuntimeException("No exams found for Term " + term + " " + academicYear);

        // ── 2. Pre-fetch ALL marks for entire class at once ──
        java.util.Map<Long, java.util.Map<String, BigDecimal>> allMidMarks = new java.util.HashMap<>();
        java.util.Map<Long, java.util.Map<String, BigDecimal>> allEndMarks = new java.util.HashMap<>();

        if (midExamOpt.isPresent()) {
            List<StudentMarkSummaryDTO> midList = markService.getClassMarkList(midExamOpt.get().getExamId());
            for (StudentMarkSummaryDTO sd : midList) {
                java.util.Map<String, BigDecimal> subMap = new java.util.HashMap<>();
                sd.getSubjectMarks().forEach(sm -> { if (sm.getScore() != null) subMap.put(sm.getSubjectName(), sm.getScore()); });
                allMidMarks.put(sd.getStudentId(), subMap);
            }
        }
        if (endExamOpt.isPresent()) {
            List<StudentMarkSummaryDTO> endList = markService.getClassMarkList(endExamOpt.get().getExamId());
            for (StudentMarkSummaryDTO sd : endList) {
                java.util.Map<String, BigDecimal> subMap = new java.util.HashMap<>();
                sd.getSubjectMarks().forEach(sm -> { if (sm.getScore() != null) subMap.put(sm.getSubjectName(), sm.getScore()); });
                allEndMarks.put(sd.getStudentId(), subMap);
            }
        }

        // ── 3. Pre-load logo once ──
        byte[] logoBytes = null;
        try (InputStream logoStream = ReportService.class.getResourceAsStream("/static/school_logo.png")) {
            if (logoStream != null) logoBytes = logoStream.readAllBytes();
        } catch (Exception ignored) {}

        // ── 4. Pre-create fonts once ──
        PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
        PdfFont italic  = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_OBLIQUE);

        // ── 5. Compute sizing once ──
        float rowH  = rowHeight(subjectTotal);
        float bodyF = bodyFont(subjectTotal);
        float hdrF  = headerFont(subjectTotal);

        int gl = classRoom.getGradeLevel();
        String levelLabel = getLevelLabel(gl);
        String gradeLabel = gl == -1 ? "PP1" : gl == 0 ? "PP2" : "GRADE " + gl;

        // ── 6. Compute margins to guarantee one-page fit ──
        float contentHeight = 70 + 30 + (levelLabel.isEmpty() ? 0 : 15) + 20 + 40
                + (subjectTotal * rowH) + rowH + 10 + 40 + 20 + 40 + 25;
        float pageHeight = 842f;
        float availableMargin = Math.max((pageHeight - contentHeight) / 2f, 18f);
        float topMargin = Math.min(availableMargin, 36f);
        float bottomMargin = Math.min(availableMargin, 36f);

        // ── 7. Build single PDF ──
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf, com.itextpdf.kernel.geom.PageSize.A4);
        doc.setMargins(topMargin, 36, bottomMargin, 36);

        int count = 0;
        for (Student student : students) {
            java.util.Map<String, BigDecimal> midMarks = allMidMarks.getOrDefault(student.getStudentId(), java.util.Collections.emptyMap());
            java.util.Map<String, BigDecimal> endMarks = allEndMarks.getOrDefault(student.getStudentId(), java.util.Collections.emptyMap());

            boolean hasAnyMark = false;
            for (Subject sub : subjects) {
                if (midMarks.containsKey(sub.getSubjectName()) || endMarks.containsKey(sub.getSubjectName())) {
                    hasAnyMark = true; break;
                }
            }
            if (!hasAnyMark) continue;

            if (count > 0) doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));

            // ── Header ──
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{18, 82})).setWidth(UnitValue.createPercentValue(100));
            if (logoBytes != null) {
                Image logo = new Image(ImageDataFactory.create(logoBytes)).setWidth(52).setHeight(52);
                headerTable.addCell(new Cell().add(logo).setBorder(Border.NO_BORDER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE).setHorizontalAlignment(HorizontalAlignment.CENTER));
            } else { headerTable.addCell(new Cell().setBorder(Border.NO_BORDER)); }

            headerTable.addCell(new Cell()
                    .add(new Paragraph("SANTA ANA CALM WATERS ACADEMY").setFont(bold).setFontSize(12).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("PO BOX 65039 - 00618 Ruaraka").setFont(regular).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("Contact: 0722479793/0113581219/0737107950").setFont(regular).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("Email: calmwaters91@gmail.com").setFont(regular).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("MOTTO: SERVING GOD & HUMANITY THROUGH EDUCATION").setFont(italic).setFontSize(6).setTextAlignment(TextAlignment.CENTER))
                    .setBorder(Border.NO_BORDER));
            doc.add(headerTable);

            // ── Title ──
            doc.add(new Paragraph("SCHOOL BASED TERM " + term + " ASSESSMENT REPORT YEAR " + academicYear)
                    .setFont(bold).setFontSize(9).setTextAlignment(TextAlignment.CENTER)
                    .setBorder(new SolidBorder(ColorConstants.BLACK, 1.2f)).setPadding(4).setMarginTop(6));

            if (!levelLabel.isEmpty())
                doc.add(new Paragraph(levelLabel).setFont(bold).setFontSize(9).setTextAlignment(TextAlignment.CENTER).setMarginTop(1));

            // ── Name / Grade ──
            Table nameGrade = new Table(UnitValue.createPercentArray(new float[]{70, 30})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(5);
            nameGrade.addCell(new Cell().add(new Paragraph("LEARNER'S NAME:  " + student.getFullName().toUpperCase()).setFont(bold).setFontSize(9)).setBorder(Border.NO_BORDER));
            nameGrade.addCell(new Cell().add(new Paragraph(gradeLabel).setFont(bold).setFontSize(9).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));
            doc.add(nameGrade);

            // ── Marks table ──
            float[] colWidths = {30, 10, 10, 10, 10, 15, 15};
            Table marksTable = new Table(UnitValue.createPercentArray(colWidths)).setWidth(UnitValue.createPercentValue(100)).setMarginTop(5);

            marksTable.addHeaderCell(new Cell(2, 1).add(new Paragraph("LEARNING AREAS").setFont(bold).setFontSize(hdrF))
                    .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(4));
            marksTable.addHeaderCell(new Cell(1, 2).add(new Paragraph("MID TERM").setFont(bold).setFontSize(hdrF))
                    .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
            marksTable.addHeaderCell(new Cell(1, 2).add(new Paragraph("END TERM").setFont(bold).setFontSize(hdrF))
                    .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
            marksTable.addHeaderCell(new Cell(1, 2).add(new Paragraph("TERMLY AVERAGE").setFont(bold).setFontSize(hdrF))
                    .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
            for (String sub : new String[]{"MARKS", "LEVEL", "MARKS", "LEVEL", "MARKS", "LEVEL"})
                marksTable.addHeaderCell(new Cell().add(new Paragraph(sub).setFont(bold).setFontSize(hdrF - 1))
                        .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(3));

            boolean alt = false;
            double totalMid = 0, totalEnd = 0, totalAvg = 0;
            int midCount = 0, endCount = 0;

            for (Subject sub : subjects) {
                DeviceRgb rb = alt?ALT_ROW_COLOR:null;
                addMarkCell(mt, sub.getSubjectName(), regular, bf, rb, TextAlignment.LEFT, rh);
                double sA=0; int sN=0;
                for (int i=0;i<bSlots.size();i++) {
                    BigDecimal score = sMaps.get(i).get(sub.getSubjectName());
                    addMarkCell(mt, score!=null?score.toPlainString():"", regular, bf, rb, TextAlignment.CENTER, rh);
                    addMarkCell(mt, score!=null?getDetailedGrade(score.doubleValue()):"", bold, bf-1, rb, TextAlignment.CENTER, rh);
                    if (score!=null) { sTotals[i]+=score.doubleValue(); sCounts[i]++; sA+=score.doubleValue(); sN++; }
                }
                if (sN>0) { double a=sA/sN; addMarkCell(mt,String.format("%.1f",a),regular,bf,rb,TextAlignment.CENTER,rh); addMarkCell(mt,getDetailedGrade(a),bold,bf-1,rb,TextAlignment.CENTER,rh); tAvg+=a; aC++; }
                else { addMarkCell(mt,"",regular,bf,rb,TextAlignment.CENTER,rh); addMarkCell(mt,"",bold,bf-1,rb,TextAlignment.CENTER,rh); }
                alt = !alt;
            }

            mt.addCell(new Cell().add(new Paragraph("TOTAL").setFont(bold).setFontSize(bf)).setBackgroundColor(TOTAL_ROW_BG).setPadding(4).setMinHeight(rh));
            for (int i=0;i<bSlots.size();i++) { addMarkCell(mt,sCounts[i]>0?String.format("%.0f",sTotals[i]):"",bold,bf,TOTAL_ROW_BG,TextAlignment.CENTER,rh); addMarkCell(mt,"",bold,bf-1,TOTAL_ROW_BG,TextAlignment.CENTER,rh); }
            double oAvg=aC>0?tAvg/aC:0;
            addMarkCell(mt,aC>0?String.format("%.1f",oAvg):"",bold,bf,TOTAL_ROW_BG,TextAlignment.CENTER,rh);
            addMarkCell(mt,aC>0?getDetailedGrade(oAvg):"",bold,bf-1,TOTAL_ROW_BG,TextAlignment.CENTER,rh);
            doc.add(mt);

            // ── Rubric ──
            doc.add(new Paragraph(" ").setMarginTop(6).setFontSize(2));
            Table rubric = new Table(UnitValue.createPercentArray(new float[]{14, 11, 11, 11, 11, 11, 11, 11, 9})).setWidth(UnitValue.createPercentValue(100));
            for (String label : new String[]{"RUBRIC","EE 1","EE 2","ME 1","ME 2","AE 1","AE 2","BE 1","BE 2"})
                rubric.addCell(new Cell().add(new Paragraph(label).setFont(bold).setFontSize(8)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(3));
            for (String mark : new String[]{"MARK","90-100","75-89","58-74","41-57","31-40","21-30","11-20","1-10"})
                rubric.addCell(new Cell().add(new Paragraph(mark).setFont(regular).setFontSize(8)).setTextAlignment(TextAlignment.CENTER).setPadding(3));
            doc.add(rubric);

            doc.add(new Paragraph("FACILITATOR'S COMMENT:  "+generateFacilitatorComment(student.getFirstName(),aC>0?getDetailedGrade(oAvg):"ME1",gl)).setFont(regular).setFontSize(8).setMarginTop(8));

            // ── Signatures ──
            Table sigTable = new Table(UnitValue.createPercentArray(new float[]{40, 35, 25})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(14);
            sigTable.addCell(new Cell().add(new Paragraph("HEAD TEACHER'S SIGNATURE:").setFont(bold).setFontSize(7))
                    .add(new Paragraph(" ").setFontSize(4)).add(new Paragraph("________________________________").setFont(regular).setFontSize(8)).setBorder(Border.NO_BORDER));
            sigTable.addCell(new Cell().add(new Paragraph("CLASS TEACHER'S SIGNATURE:").setFont(bold).setFontSize(7))
                    .add(new Paragraph(" ").setFontSize(4)).add(new Paragraph("______________________").setFont(regular).setFontSize(8)).setBorder(Border.NO_BORDER));
            sigTable.addCell(new Cell().add(new Paragraph("DATE:").setFont(bold).setFontSize(7))
                    .add(new Paragraph(" ").setFontSize(4)).add(new Paragraph("_________________").setFont(regular).setFontSize(8)).setBorder(Border.NO_BORDER));
            doc.add(sigTable);

            // ── Dates ──
            Table datesTable = new Table(UnitValue.createPercentArray(new float[]{50, 50})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(6);
            datesTable.addCell(new Cell().add(new Paragraph("CLOSING DATE:  ________________________").setFont(regular).setFontSize(8)).setBorder(Border.NO_BORDER));
            datesTable.addCell(new Cell().add(new Paragraph("OPENING DATE:  ________________________").setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));
            doc.add(datesTable);

            count++;
        }

        if (count == 0) throw new RuntimeException("No report cards could be generated — ensure marks are entered");

        doc.close();
        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────
    // SCHOOL-WIDE REPORT PDF
    // ──────────────────────────────────────────────────────────────
    public byte[] generateSchoolReportPdf(String academicYear, Integer term, String examName) throws Exception {
        List<ClassRoom> classes = classRoomRepository.findByAcademicYear(academicYear);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        pdf.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4.rotate());
        Document doc = new Document(pdf);
        doc.setMargins(30, 30, 30, 30);

        PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

        addSchoolHeader(doc, bold, regular);
        doc.add(new Paragraph("School-Wide Report — " + examName + " | Term " + term + " | " + academicYear)
                .setFont(regular).setFontSize(12).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(" "));

        if (classes.isEmpty()) {
            doc.add(new Paragraph("No classes found for " + academicYear).setFont(regular));
            doc.close();
            return baos.toByteArray();
        }

        for (ClassRoom classRoom : classes) {
            List<Exam> exams = examRepository.findByClassRoom_ClassIdAndTermAndAcademicYear(classRoom.getClassId(), term, academicYear);
            java.util.Optional<Exam> examOpt = exams.stream().filter(e -> e.getExamName().equalsIgnoreCase(examName)).findFirst();
            if (examOpt.isEmpty()) continue;

            List<StudentMarkSummaryDTO> ml = markService.getClassMarkList(examOpt.get().getExamId());
            if (ml.isEmpty()) continue;

            doc.add(new Paragraph(cr.getDisplayName()).setFont(bold).setFontSize(13).setFontColor(HEADER_COLOR).setMarginTop(10));
            Table t = new Table(UnitValue.createPercentArray(new float[]{1,2,3,2,1,1,1})).setWidth(UnitValue.createPercentValue(100));
            for (String h : new String[]{"#","Adm No.","Name","Subjects Sat","Total","Average","Grade"}) addHeaderCell(t,h,bold);
            boolean alt=false;
            for (StudentMarkSummaryDTO s : ml) {
                DeviceRgb rc = alt?ALT_ROW_COLOR:null;
                addCell(t,String.valueOf(s.getPosition()),regular,rc); addCell(t,s.getAdmissionNumber(),regular,rc);
                addCell(t,s.getFullName(),regular,rc); addCell(t,String.valueOf(s.getSubjectMarks().size()),regular,rc);
                addCell(t,String.format("%.1f",s.getTotalScore()),regular,rc); addCell(t,String.format("%.2f",s.getAverage()),regular,rc);
                String g = getSimpleCbcGrade(s.getAverage(),cr.getGradeLevel());
                Cell gc = new Cell().add(new Paragraph(g).setFont(bold).setFontSize(9).setFontColor(getGradeColor(g))).setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE);
                if (rc!=null) gc.setBackgroundColor(rc); t.addCell(gc); alt=!alt;
            }
            doc.add(t);
            double ca=ml.stream().mapToDouble(x->x.getAverage()!=null?x.getAverage():0).average().orElse(0);
            doc.add(new Paragraph(String.format("Class Average: %.2f  |  Students: %d",ca,ml.size())).setFont(bold).setFontSize(10).setFontColor(HEADER_COLOR).setMarginBottom(10));
        }
        doc.close(); return baos.toByteArray();
    }

    // ══════════════════════════════════════════════════════════════
    //  EXAM DETECTION HELPERS
    // ══════════════════════════════════════════════════════════════
    private List<ExamSlot> detectExamSlots(List<Exam> exams, Long studentId) {
        List<ExamSlot> slots = new ArrayList<>();
        Optional<Exam> opener = exams.stream().filter(e->e.getExamName().toLowerCase().contains("opener")).findFirst();
        Optional<Exam> mid = exams.stream().filter(e->{ String n=e.getExamName().toLowerCase(); return n.contains("mid")&&!n.contains("opener"); }).findFirst();
        Optional<Exam> end = exams.stream().filter(e->e.getExamName().toLowerCase().contains("end")).findFirst();
        if (opener.isPresent()) slots.add(new ExamSlot("OPENER", loadMarks(opener.get(), studentId)));
        if (mid.isPresent())    slots.add(new ExamSlot("MID TERM", loadMarks(mid.get(), studentId)));
        if (end.isPresent())    slots.add(new ExamSlot("END TERM", loadMarks(end.get(), studentId)));
        return slots;
    }

    private Map<String,BigDecimal> loadMarks(Exam exam, Long studentId) {
        Map<String,BigDecimal> m = new HashMap<>();
        markService.getClassMarkList(exam.getExamId()).stream().filter(s->s.getStudentId().equals(studentId)).findFirst()
            .ifPresent(sd->sd.getSubjectMarks().forEach(sm->{ if(sm.getScore()!=null) m.put(sm.getSubjectName(),sm.getScore()); }));
        return m;
    }

    private List<BatchExamSlot> detectBatchExamSlots(List<Exam> exams) {
        List<BatchExamSlot> slots = new ArrayList<>();
        Optional<Exam> opener = exams.stream().filter(e->e.getExamName().toLowerCase().contains("opener")).findFirst();
        Optional<Exam> mid = exams.stream().filter(e->{ String n=e.getExamName().toLowerCase(); return n.contains("mid")&&!n.contains("opener"); }).findFirst();
        Optional<Exam> end = exams.stream().filter(e->e.getExamName().toLowerCase().contains("end")).findFirst();
        if (opener.isPresent()) slots.add(new BatchExamSlot("OPENER", loadBatchMarks(opener.get())));
        if (mid.isPresent())    slots.add(new BatchExamSlot("MID TERM", loadBatchMarks(mid.get())));
        if (end.isPresent())    slots.add(new BatchExamSlot("END TERM", loadBatchMarks(end.get())));
        return slots;
    }

    private Map<Long,Map<String,BigDecimal>> loadBatchMarks(Exam exam) {
        Map<Long,Map<String,BigDecimal>> all = new HashMap<>();
        for (StudentMarkSummaryDTO sd : markService.getClassMarkList(exam.getExamId())) {
            Map<String,BigDecimal> sub = new HashMap<>();
            sd.getSubjectMarks().forEach(sm->{ if(sm.getScore()!=null) sub.put(sm.getSubjectName(),sm.getScore()); });
            all.put(sd.getStudentId(), sub);
        }
        return all;
    }

    // ══════════════════════════════════════════════════════════════
    //  DYNAMIC TABLE HEADER — adapts to 1, 2, or 3 exam columns
    // ══════════════════════════════════════════════════════════════
    private Table buildDynamicTableHeader(List<String> examHeaders, float bf, float hf) throws Exception {
        int n = examHeaders.size();
        int tc = 1 + (n*2) + 2;
        float[] w = new float[tc];
        if (n==1)      { w[0]=34; w[1]=13; w[2]=13; w[3]=20; w[4]=20; }
        else if (n==2) { w[0]=30; w[1]=10; w[2]=10; w[3]=10; w[4]=10; w[5]=15; w[6]=15; }
        else           { w[0]=22; for(int i=0;i<3;i++){w[1+i*2]=8;w[2+i*2]=8;} w[7]=15; w[8]=15; }

        Table t = new Table(UnitValue.createPercentArray(w)).setWidth(UnitValue.createPercentValue(100)).setMarginTop(5);
        PdfFont hb = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        t.addHeaderCell(new Cell(2,1).add(new Paragraph("LEARNING AREAS").setFont(hb).setFontSize(hf)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(4));
        for (String h : examHeaders) t.addHeaderCell(new Cell(1,2).add(new Paragraph(h).setFont(hb).setFontSize(hf)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
        t.addHeaderCell(new Cell(1,2).add(new Paragraph("TERMLY AVERAGE").setFont(hb).setFontSize(hf)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
        for (int i=0;i<n+1;i++) {
            t.addHeaderCell(new Cell().add(new Paragraph("MARKS").setFont(hb).setFontSize(hf-1)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(3));
            t.addHeaderCell(new Cell().add(new Paragraph("LEVEL").setFont(hb).setFontSize(hf-1)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(3));
        }
        doc.close();
        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────
    // SHARED BUILDERS
    // ──────────────────────────────────────────────────────────────

    private void buildReportHeader(Document doc, PdfFont bold, PdfFont regular, PdfFont italic) throws Exception {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{18, 82})).setWidth(UnitValue.createPercentValue(100));
        try (InputStream logoStream = ReportService.class.getResourceAsStream("/static/school_logo.png")) {
            if (logoStream != null) {
                byte[] logoBytes = logoStream.readAllBytes();
                Image logo = new Image(ImageDataFactory.create(logoBytes)).setWidth(58).setHeight(58);
                headerTable.addCell(new Cell().add(logo).setBorder(Border.NO_BORDER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE).setHorizontalAlignment(HorizontalAlignment.CENTER));
            } else { headerTable.addCell(new Cell().setBorder(Border.NO_BORDER)); }
        } catch (Exception ignored) { headerTable.addCell(new Cell().setBorder(Border.NO_BORDER)); }

        headerTable.addCell(new Cell()
                .add(new Paragraph("SANTA ANA CALM WATERS ACADEMY").setFont(bold).setFontSize(13).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("PO BOX 65039 - 00618 Ruaraka").setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("Contact: 0722479793/0113581219/0737107950").setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("Email: calmwaters91@gmail.com").setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("MOTTO: SERVING GOD & HUMANITY THROUGH EDUCATION").setFont(italic).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
                .setBorder(Border.NO_BORDER));
        doc.add(headerTable);
    }

    private void buildNameGradeRow(Document doc, PdfFont bold, String fullName, String gradeLabel) {
        Table nameGrade = new Table(UnitValue.createPercentArray(new float[]{70, 30})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(8);
        nameGrade.addCell(new Cell().add(new Paragraph("LEARNER'S NAME:  " + fullName.toUpperCase()).setFont(bold).setFontSize(10)).setBorder(Border.NO_BORDER));
        nameGrade.addCell(new Cell().add(new Paragraph(gradeLabel).setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));
        doc.add(nameGrade);
    }

    private Table buildTableHeader(float bodyF, float hdrF) throws Exception {
        float[] colWidths = {30, 10, 10, 10, 10, 15, 15};
        Table t = new Table(UnitValue.createPercentArray(colWidths)).setWidth(UnitValue.createPercentValue(100)).setMarginTop(8);

        PdfFont hdrBold = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);

        t.addHeaderCell(new Cell(2, 1).add(new Paragraph("LEARNING AREAS").setFont(hdrBold).setFontSize(hdrF))
                .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(6));
        t.addHeaderCell(new Cell(1, 2).add(new Paragraph("MID TERM").setFont(hdrBold).setFontSize(hdrF))
                .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(6));
        t.addHeaderCell(new Cell(1, 2).add(new Paragraph("END TERM").setFont(hdrBold).setFontSize(hdrF))
                .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(6));
        t.addHeaderCell(new Cell(1, 2).add(new Paragraph("TERMLY AVERAGE").setFont(hdrBold).setFontSize(hdrF))
                .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(6));

        for (String sub : new String[]{"MARKS", "LEVEL", "MARKS", "LEVEL", "MARKS", "LEVEL"})
            t.addHeaderCell(new Cell().add(new Paragraph(sub).setFont(hdrBold).setFontSize(hdrF - 1))
                    .setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
        return t;
    }

    // ── CHANGED: reduced margins to help single-student fit on one page ──
    private void buildRubric(Document doc, PdfFont bold, PdfFont regular) {
        doc.add(new Paragraph(" ").setMarginTop(6));
        Table rubric = new Table(UnitValue.createPercentArray(new float[]{14, 11, 11, 11, 11, 11, 11, 11, 9})).setWidth(UnitValue.createPercentValue(100));
        for (String label : new String[]{"RUBRIC","EE 1","EE 2","ME 1","ME 2","AE 1","AE 2","BE 1","BE 2"})
            rubric.addCell(new Cell().add(new Paragraph(label).setFont(bold).setFontSize(9)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
        for (String mark : new String[]{"MARK","90-100","75-89","58-74","41-57","31-40","21-30","11-20","1-10"})
            rubric.addCell(new Cell().add(new Paragraph(mark).setFont(regular).setFontSize(9)).setTextAlignment(TextAlignment.CENTER).setPadding(4));
        doc.add(rubric);
    }

    // ── CHANGED: setMarginTop(20) → setMarginTop(14) ──
    private void buildSignatures(Document doc, PdfFont bold, PdfFont regular) {
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{40, 35, 25})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(14);
        sigTable.addCell(new Cell().add(new Paragraph("HEAD TEACHER'S SIGNATURE:").setFont(bold).setFontSize(8))
                .add(new Paragraph(" ").setFontSize(6)).add(new Paragraph("________________________________").setFont(regular).setFontSize(9)).setBorder(Border.NO_BORDER));
        sigTable.addCell(new Cell().add(new Paragraph("CLASS TEACHER'S SIGNATURE:").setFont(bold).setFontSize(8))
                .add(new Paragraph(" ").setFontSize(6)).add(new Paragraph("______________________").setFont(regular).setFontSize(9)).setBorder(Border.NO_BORDER));
        sigTable.addCell(new Cell().add(new Paragraph("DATE:").setFont(bold).setFontSize(8))
                .add(new Paragraph(" ").setFontSize(6)).add(new Paragraph("_________________").setFont(regular).setFontSize(9)).setBorder(Border.NO_BORDER));
        doc.add(sigTable);
    }

    // ── CHANGED: setMarginTop(10) → setMarginTop(6) ──
    private void buildDates(Document doc, PdfFont regular) {
        Table datesTable = new Table(UnitValue.createPercentArray(new float[]{50, 50})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(6);
        datesTable.addCell(new Cell().add(new Paragraph("CLOSING DATE:  ________________________").setFont(regular).setFontSize(9)).setBorder(Border.NO_BORDER));
        datesTable.addCell(new Cell().add(new Paragraph("OPENING DATE:  ________________________").setFont(regular).setFontSize(9).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));
        doc.add(datesTable);
    }

    private void addSchoolHeader(Document doc, PdfFont bold, PdfFont regular) throws Exception {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{12, 88})).setWidth(UnitValue.createPercentValue(100));
        try (InputStream logoStream = ReportService.class.getResourceAsStream("/static/school_logo.png")) {
            if (logoStream != null) {
                byte[] logoBytes = logoStream.readAllBytes();
                Image logo = new Image(ImageDataFactory.create(logoBytes)).setWidth(45).setHeight(45);
                headerTable.addCell(new Cell().add(logo).setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE));
            } else { headerTable.addCell(new Cell().setBorder(Border.NO_BORDER)); }
        } catch (Exception ignored) { headerTable.addCell(new Cell().setBorder(Border.NO_BORDER)); }
        headerTable.addCell(new Cell().add(new Paragraph("SANTA ANA CALM WATERS ACADEMY")
                .setFont(bold).setFontSize(14).setTextAlignment(TextAlignment.CENTER).setFontColor(HEADER_COLOR)).setBorder(Border.NO_BORDER));
        doc.add(headerTable);
    }

    private void addHeaderCell(Table table, String text, PdfFont font) {
        table.addHeaderCell(new Cell().add(new Paragraph(text).setFont(font).setFontSize(9))
                .setBackgroundColor(HEADER_COLOR).setFontColor(ColorConstants.WHITE)
                .setTextAlignment(TextAlignment.CENTER).setPadding(5));
    }

    private void addCell(Table table, String text, PdfFont font, DeviceRgb bg) {
        Cell cell = new Cell().add(new Paragraph(text != null ? text : "-").setFont(font).setFontSize(9))
                .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(4);
        if (bg != null) cell.setBackgroundColor(bg);
        table.addCell(cell);
    }

    private void addMarkCell(Table table, String text, PdfFont font, float fontSize, DeviceRgb bg, TextAlignment align, float minHeight) {
        Cell cell = new Cell().add(new Paragraph(text != null ? text : "").setFont(font).setFontSize(fontSize))
                .setTextAlignment(align).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(4).setMinHeight(minHeight);
        if (bg != null) cell.setBackgroundColor(bg);
        table.addCell(cell);
    }

    // ── Sizing helpers ──
    private float rowHeight(int n)  { return n<=5?52f:n<=7?42f:n<=9?34f:26f; }
    private float bodyFont(int n)   { return n<=5?12f:n<=7?11f:n<=9?10f:9f; }
    private float headerFont(int n) { return n<=7?10f:9f; }

    // ── Grade helpers ──
    private String getDetailedGrade(double s) { if(s>=90)return"EE1";if(s>=75)return"EE2";if(s>=58)return"ME1";if(s>=41)return"ME2";if(s>=31)return"AE1";if(s>=21)return"AE2";if(s>=11)return"BE1";return"BE2"; }
    private String getSimpleCbcGrade(double a, int gl) { if(gl<=3)return a>=75?"EE":a>=50?"ME":a>=25?"AE":"BE"; return a>=75?"EE":a>=41?"ME":a>=21?"AE":"BE"; }
    private DeviceRgb getGradeColor(String g) { if(g==null)return new DeviceRgb(0,0,0); if(g.startsWith("EE"))return EE_COLOR;if(g.startsWith("ME"))return ME_COLOR;if(g.startsWith("AE"))return AE_COLOR;if(g.startsWith("BE"))return BE_COLOR;return new DeviceRgb(0,0,0); }
    private String getLevelLabel(int gl) { if(gl==-1)return"PRE-PRIMARY ONE (PP1)";if(gl==0)return"PRE-PRIMARY TWO (PP2)";return""; }

    private String generateFacilitatorComment(String firstName, String detailedGrade, int gradeLevel) {
        String name = firstName != null ? firstName : "The learner";
        return switch (detailedGrade) {
            case "EE1" -> name + " has demonstrated exceptional mastery this term. Outstanding performance — keep reaching higher!";
            case "EE2" -> name + " has excelled this term and shows strong understanding. Maintain this excellent effort.";
            case "ME1" -> name + " has met expectations with commendable performance. A little more effort will take you to excellence.";
            case "ME2" -> name + " has met expectations this term. Encourage continued practice to improve further.";
            case "AE1" -> name + " is approaching expectations. With more dedication and revision, improvement is very achievable.";
            case "AE2" -> name + " is working towards expectations. Additional support and practice at home is recommended.";
            case "BE1" -> name + " requires significant support this term. Please engage closely with the class teacher for an improvement plan.";
            case "BE2" -> name + " needs urgent academic intervention. Regular revision and parental support are strongly advised.";
            default    -> name + " has completed the term. Continued effort and dedication will lead to improvement.";
        };
    }
}