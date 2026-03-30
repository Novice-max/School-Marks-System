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

        // Header
        addSchoolHeader(doc, bold, regular);

        doc.add(new Paragraph(exam.getClassRoom().getDisplayName() + " — "
                + exam.getExamName() + " | Term " + exam.getTerm()
                + " | " + exam.getAcademicYear())
                .setFont(regular).setFontSize(11).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(" "));

        if (marklist.isEmpty()) {
            doc.add(new Paragraph("No marks entered for this exam.").setFont(regular).setFontSize(11));
            doc.close();
            return baos.toByteArray();
        }

        List<SubjectMarkDTO> sampleSubjects = marklist.get(0).getSubjectMarks();
        int colCount = 3 + sampleSubjects.size() + 3;

        Table table = new Table(UnitValue.createPercentArray(colCount))
                .setWidth(UnitValue.createPercentValue(100));

        String[] fixedHeaders = {"#", "Admission No.", "Student Name"};
        for (String h : fixedHeaders) addHeaderCell(table, h, bold);
        for (SubjectMarkDTO s : sampleSubjects) addHeaderCell(table, s.getSubjectName(), bold);
        for (String h : new String[]{"Total", "Average", "Overall"}) addHeaderCell(table, h, bold);

        boolean alt = false;
        for (StudentMarkSummaryDTO student : marklist) {
            DeviceRgb rowColor = alt ? ALT_ROW_COLOR : null;
            addCell(table, String.valueOf(student.getPosition()), regular, rowColor);
            addCell(table, student.getAdmissionNumber(), regular, rowColor);
            addCell(table, student.getFullName(), regular, rowColor);

            double totalPoints = 0;
            int subjectCount = 0;

            for (SubjectMarkDTO sm : student.getSubjectMarks()) {
                if (sm.getScore() != null) {
                    Cell cell = new Cell().add(new Paragraph(sm.getScore().toPlainString())
                            .setFont(regular).setFontSize(9))
                            .setTextAlignment(TextAlignment.CENTER)
                            .setVerticalAlignment(VerticalAlignment.MIDDLE);
                    if (rowColor != null) cell.setBackgroundColor(rowColor);
                    if (sm.getGrade() != null) cell.setFontColor(getGradeColor(sm.getGrade()));
                    table.addCell(cell);
                    totalPoints += sm.getScore().doubleValue();
                    subjectCount++;
                } else {
                    addCell(table, "-", regular, rowColor);
                }
            }

            double avg = subjectCount > 0
                    ? BigDecimal.valueOf(totalPoints / subjectCount)
                        .setScale(2, RoundingMode.HALF_UP).doubleValue()
                    : 0;

            String overallGrade = getSimpleCbcGrade(avg, exam.getClassRoom().getGradeLevel());

            addCell(table, String.format("%.1f", totalPoints), regular, rowColor);
            addCell(table, String.format("%.2f", avg), regular, rowColor);

            Cell gradeCell = new Cell().add(new Paragraph(overallGrade).setFont(bold).setFontSize(9))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setFontColor(getGradeColor(overallGrade));
            if (rowColor != null) gradeCell.setBackgroundColor(rowColor);
            table.addCell(gradeCell);

            alt = !alt;
        }

        doc.add(table);
        doc.add(new Paragraph(" "));

        double classAvg = marklist.stream()
                .mapToDouble(s -> s.getAverage() != null ? s.getAverage() : 0)
                .average().orElse(0);

        doc.add(new Paragraph("Class Average: " + BigDecimal.valueOf(classAvg)
                .setScale(2, RoundingMode.HALF_UP) + "  |  Total Students: " + marklist.size())
                .setFont(bold).setFontSize(10).setFontColor(HEADER_COLOR));

        doc.close();
        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────
    // STUDENT REPORT CARD PDF — matches physical Santa Ana format
    // ──────────────────────────────────────────────────────────────
    public byte[] generateStudentMarksheetPdf(Long studentId, Long examId) throws Exception {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        List<StudentMarkSummaryDTO> marklist = markService.getClassMarkList(examId);
        StudentMarkSummaryDTO studentData = marklist.stream()
                .filter(s -> s.getStudentId().equals(studentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No marks found for this student"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf);
        doc.setMargins(36, 36, 36, 36);

        PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
        PdfFont italic  = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_OBLIQUE);

        // ── 1. SCHOOL HEADER: logo left, school info right ──
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{18, 82}))
                .setWidth(UnitValue.createPercentValue(100));

        // Logo
        try (InputStream logoStream = ReportService.class.getResourceAsStream("/static/school_logo.png")) {
            if (logoStream != null) {
                byte[] logoBytes = logoStream.readAllBytes();
                Image logo = new Image(ImageDataFactory.create(logoBytes))
                        .setWidth(58).setHeight(58);
                headerTable.addCell(new Cell().add(logo)
                        .setBorder(Border.NO_BORDER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE)
                        .setHorizontalAlignment(HorizontalAlignment.CENTER));
            } else {
                headerTable.addCell(new Cell().setBorder(Border.NO_BORDER));
            }
        } catch (Exception ignored) {
            headerTable.addCell(new Cell().setBorder(Border.NO_BORDER));
        }

        // School info
        headerTable.addCell(new Cell()
                .add(new Paragraph("SANTA ANA CALM WATERS ACADEMY")
                        .setFont(bold).setFontSize(13).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("PO BOX 65039 - 00618 Ruaraka")
                        .setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("Contact: 0722479793/0113581219/0737107950")
                        .setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("Email: calmwaters91@gmail.com")
                        .setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("MOTTO: SERVING GOD & HUMANITY THROUGH EDUCATION")
                        .setFont(italic).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
                .setBorder(Border.NO_BORDER));

        doc.add(headerTable);

        // ── 2. TITLE BOX ──
        doc.add(new Paragraph(
                "SCHOOL BASED TERM " + exam.getTerm() + " ASSESSMENT REPORT YEAR " + exam.getAcademicYear())
                .setFont(bold).setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER)
                .setBorder(new SolidBorder(ColorConstants.BLACK, 1.5f))
                .setPadding(5).setMarginTop(8));

        // ── 2b. LEVEL LABEL (e.g. PRE-PRIMARY TWO) ──
        String levelLabel = getLevelLabel(exam.getClassRoom().getGradeLevel());
        if (!levelLabel.isEmpty()) {
            doc.add(new Paragraph(levelLabel)
                    .setFont(bold).setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(2));
        }

        // ── 3. LEARNER NAME + GRADE ──
        int gl = exam.getClassRoom().getGradeLevel();
        String gradeLabel = gl == -1 ? "PP1" : gl == 0 ? "PP2" : "GRADE " + gl;
        Table nameGrade = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                .setWidth(UnitValue.createPercentValue(100)).setMarginTop(8);
        nameGrade.addCell(new Cell()
                .add(new Paragraph("LEARNER'S NAME:  " + student.getFullName().toUpperCase())
                        .setFont(bold).setFontSize(10))
                .setBorder(Border.NO_BORDER));
        nameGrade.addCell(new Cell()
                .add(new Paragraph(gradeLabel)
                        .setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.RIGHT))
                .setBorder(Border.NO_BORDER));
        doc.add(nameGrade);

        // ── 4. MARKS TABLE ──
        String examNameLower = exam.getExamName().toLowerCase();
        boolean isMidTerm = examNameLower.contains("mid") || examNameLower.contains("opener");
        boolean isEndTerm = examNameLower.contains("end");

        // Dynamically scale fonts and row height based on subject count
        int subjectTotal = studentData.getSubjectMarks().size();
        float rowMinHeight = subjectTotal <= 5  ? 52f :
                             subjectTotal <= 7  ? 42f :
                             subjectTotal <= 9  ? 34f : 26f;
        float bodyFont    = subjectTotal <= 5  ? 12f :
                            subjectTotal <= 7  ? 11f :
                            subjectTotal <= 9  ? 10f : 9f;
        float headerFont  = subjectTotal <= 7  ? 10f : 9f;

        float[] colWidths = {38, 12, 12, 12, 13, 13};
        Table marksTable = new Table(UnitValue.createPercentArray(colWidths))
                .setWidth(UnitValue.createPercentValue(100)).setMarginTop(8);

        // Header Row 1: LEARNING AREAS (rowspan 2) | MID TERM (colspan 2) | END TERM (rowspan 2) | TERMLY AVERAGE (colspan 2)
        marksTable.addHeaderCell(new Cell(2, 1)
                .add(new Paragraph("LEARNING AREAS").setFont(bold).setFontSize(headerFont))
                .setBackgroundColor(TABLE_HEADER_BG)
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPadding(6));

        marksTable.addHeaderCell(new Cell(1, 2)
                .add(new Paragraph("MID TERM").setFont(bold).setFontSize(headerFont))
                .setBackgroundColor(TABLE_HEADER_BG)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(6));

        marksTable.addHeaderCell(new Cell(2, 1)
                .add(new Paragraph("END TERM\nMARKS").setFont(bold).setFontSize(headerFont))
                .setBackgroundColor(TABLE_HEADER_BG)
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPadding(6));

        marksTable.addHeaderCell(new Cell(1, 2)
                .add(new Paragraph("TERMLY AVERAGE").setFont(bold).setFontSize(headerFont))
                .setBackgroundColor(TABLE_HEADER_BG)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(6));

        // Header Row 2: sub-columns
        marksTable.addHeaderCell(new Cell()
                .add(new Paragraph("MARKS").setFont(bold).setFontSize(headerFont - 1))
                .setBackgroundColor(TABLE_HEADER_BG)
                .setTextAlignment(TextAlignment.CENTER).setPadding(4));
        marksTable.addHeaderCell(new Cell()
                .add(new Paragraph("LEVEL").setFont(bold).setFontSize(headerFont - 1))
                .setBackgroundColor(TABLE_HEADER_BG)
                .setTextAlignment(TextAlignment.CENTER).setPadding(4));
        marksTable.addHeaderCell(new Cell()
                .add(new Paragraph("MARKS").setFont(bold).setFontSize(headerFont - 1))
                .setBackgroundColor(TABLE_HEADER_BG)
                .setTextAlignment(TextAlignment.CENTER).setPadding(4));
        marksTable.addHeaderCell(new Cell()
                .add(new Paragraph("LEVEL").setFont(bold).setFontSize(headerFont - 1))
                .setBackgroundColor(TABLE_HEADER_BG)
                .setTextAlignment(TextAlignment.CENTER).setPadding(4));

        // Data rows
        double totalScore = 0;
        int subjectCount  = 0;
        boolean alt = false;

        for (SubjectMarkDTO sm : studentData.getSubjectMarks()) {
            DeviceRgb rowBg = alt ? ALT_ROW_COLOR : null;

            String scoreStr = sm.getScore() != null ? sm.getScore().toPlainString() : "";
            double score    = sm.getScore() != null ? sm.getScore().doubleValue() : 0;
            String level    = sm.getScore() != null ? getDetailedGrade(score) : "";

            addMarkCell(marksTable, sm.getSubjectName(), regular, bodyFont, rowBg, TextAlignment.LEFT, rowMinHeight);

            if (isMidTerm) {
                addMarkCell(marksTable, scoreStr, regular, bodyFont,     rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, level,    bold,    bodyFont - 1, rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, "",        regular, bodyFont,    rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, scoreStr, regular, bodyFont,     rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, level,    bold,    bodyFont - 1, rowBg, TextAlignment.CENTER, rowMinHeight);
            } else if (isEndTerm) {
                addMarkCell(marksTable, "",        regular, bodyFont,     rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, "",        regular, bodyFont - 1, rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, scoreStr, regular, bodyFont,     rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, scoreStr, regular, bodyFont,     rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, level,    bold,    bodyFont - 1, rowBg, TextAlignment.CENTER, rowMinHeight);
            } else {
                addMarkCell(marksTable, scoreStr, regular, bodyFont,     rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, level,    bold,    bodyFont - 1, rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, scoreStr, regular, bodyFont,     rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, scoreStr, regular, bodyFont,     rowBg, TextAlignment.CENTER, rowMinHeight);
                addMarkCell(marksTable, level,    bold,    bodyFont - 1, rowBg, TextAlignment.CENTER, rowMinHeight);
            }

            if (sm.getScore() != null) {
                totalScore += score;
                subjectCount++;
            }
            alt = !alt;
        }

        // TOTAL row
        double avg     = subjectCount > 0 ? totalScore / subjectCount : 0;
        String totalStr = subjectCount > 0 ? String.format("%.0f", totalScore) : "";
        String avgStr   = subjectCount > 0 ? String.format("%.1f", avg)        : "";
        String avgLevel = subjectCount > 0 ? getDetailedGrade(avg)             : "";

        marksTable.addCell(new Cell()
                .add(new Paragraph("TOTAL").setFont(bold).setFontSize(bodyFont))
                .setBackgroundColor(TOTAL_ROW_BG).setPadding(6)
                .setMinHeight(rowMinHeight));

        if (isMidTerm) {
            addMarkCell(marksTable, totalStr, bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, "",       bold, bodyFont - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, "",       bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, avgStr,   bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, avgLevel, bold, bodyFont - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
        } else if (isEndTerm) {
            addMarkCell(marksTable, "",       bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, "",       bold, bodyFont - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, totalStr, bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, avgStr,   bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, avgLevel, bold, bodyFont - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
        } else {
            addMarkCell(marksTable, totalStr, bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, "",       bold, bodyFont - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, totalStr, bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, avgStr,   bold, bodyFont,     TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
            addMarkCell(marksTable, avgLevel, bold, bodyFont - 1, TOTAL_ROW_BG, TextAlignment.CENTER, rowMinHeight);
        }

        doc.add(marksTable);

        // ── 5. RUBRIC TABLE ──
        doc.add(new Paragraph(" ").setMarginTop(10));

        Table rubric = new Table(UnitValue.createPercentArray(new float[]{14, 11, 11, 11, 11, 11, 11, 11, 9}))
                .setWidth(UnitValue.createPercentValue(100));

        String[] rubricLabels = {"RUBRIC", "EE 1",   "EE 2",   "ME 1",   "ME 2",   "AE 1",   "AE 2",   "BE 1",   "BE 2"};
        String[] markRanges   = {"MARK",   "90-100", "75-89",  "58-74",  "41-57",  "31-40",  "21-30",  "11-20",  "1-10"};

        for (String label : rubricLabels) {
            rubric.addCell(new Cell()
                    .add(new Paragraph(label).setFont(bold).setFontSize(7))
                    .setBackgroundColor(TABLE_HEADER_BG)
                    .setTextAlignment(TextAlignment.CENTER).setPadding(3));
        }
        for (String mark : markRanges) {
            rubric.addCell(new Cell()
                    .add(new Paragraph(mark).setFont(regular).setFontSize(7))
                    .setTextAlignment(TextAlignment.CENTER).setPadding(3));
        }
        doc.add(rubric);

        // ── 6. AUTO-GENERATED FACILITATOR'S COMMENT ──
        String autoComment = generateFacilitatorComment(
                student.getFirstName(), avgLevel, exam.getClassRoom().getGradeLevel());
        doc.add(new Paragraph("FACILITATOR'S COMMENT:  " + autoComment)
                .setFont(regular).setFontSize(9).setMarginTop(12));

        // ── 7. SIGNATURES ──
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{40, 35, 25}))
                .setWidth(UnitValue.createPercentValue(100)).setMarginTop(14);
        sigTable.addCell(new Cell()
                .add(new Paragraph("HEAD TEACHER'S SIGNATURE:").setFont(bold).setFontSize(8))
                .add(new Paragraph("________________________________").setFont(regular).setFontSize(9))
                .setBorder(Border.NO_BORDER));
        sigTable.addCell(new Cell()
                .add(new Paragraph("SIGNATURE:").setFont(bold).setFontSize(8))
                .add(new Paragraph("______________________").setFont(regular).setFontSize(9))
                .setBorder(Border.NO_BORDER));
        sigTable.addCell(new Cell()
                .add(new Paragraph("DATE:").setFont(bold).setFontSize(8))
                .add(new Paragraph("_________________").setFont(regular).setFontSize(9))
                .setBorder(Border.NO_BORDER));
        doc.add(sigTable);

        // ── 8. CLOSING / OPENING DATES ──
        Table datesTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                .setWidth(UnitValue.createPercentValue(100)).setMarginTop(10);
        datesTable.addCell(new Cell()
                .add(new Paragraph("CLOSING DATE:  ________________________").setFont(regular).setFontSize(9))
                .setBorder(Border.NO_BORDER));
        datesTable.addCell(new Cell()
                .add(new Paragraph("OPENING DATE:  ________________________")
                        .setFont(regular).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .setBorder(Border.NO_BORDER));
        doc.add(datesTable);

        doc.close();
        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────
    // SCHOOL-WIDE REPORT PDF
    // ──────────────────────────────────────────────────────────────
    public byte[] generateSchoolReportPdf(String academicYear, Integer term, String examName) throws Exception {
        List<com.school.marks.model.ClassRoom> classes = classRoomRepository.findByAcademicYear(academicYear);

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

        for (com.school.marks.model.ClassRoom classRoom : classes) {
            List<com.school.marks.model.Exam> exams = examRepository
                .findByClassRoom_ClassIdAndTermAndAcademicYear(classRoom.getClassId(), term, academicYear);

            java.util.Optional<com.school.marks.model.Exam> examOpt = exams.stream()
                .filter(e -> e.getExamName().equalsIgnoreCase(examName))
                .findFirst();

            if (examOpt.isEmpty()) continue;

            List<com.school.marks.dto.StudentMarkSummaryDTO> ml =
                markService.getClassMarkList(examOpt.get().getExamId());

            if (ml.isEmpty()) continue;

            doc.add(new Paragraph(classRoom.getDisplayName())
                    .setFont(bold).setFontSize(13).setFontColor(HEADER_COLOR).setMarginTop(10));

            Table table = new Table(UnitValue.createPercentArray(new float[]{1, 2, 3, 2, 1, 1, 1}))
                    .setWidth(UnitValue.createPercentValue(100));

            for (String h : new String[]{"#", "Adm No.", "Name", "Subjects Sat", "Total", "Average", "Grade"}) {
                addHeaderCell(table, h, bold);
            }

            boolean alt = false;
            for (com.school.marks.dto.StudentMarkSummaryDTO st : ml) {
                DeviceRgb rowColor = alt ? ALT_ROW_COLOR : null;
                addCell(table, String.valueOf(st.getPosition()), regular, rowColor);
                addCell(table, st.getAdmissionNumber(), regular, rowColor);
                addCell(table, st.getFullName(), regular, rowColor);
                addCell(table, String.valueOf(st.getSubjectMarks().size()), regular, rowColor);
                addCell(table, String.format("%.1f", st.getTotalScore()), regular, rowColor);
                addCell(table, String.format("%.2f", st.getAverage()), regular, rowColor);
                String grade = getSimpleCbcGrade(st.getAverage(), classRoom.getGradeLevel());
                Cell gradeCell = new Cell()
                        .add(new Paragraph(grade).setFont(bold).setFontSize(9).setFontColor(getGradeColor(grade)))
                        .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE);
                if (rowColor != null) gradeCell.setBackgroundColor(rowColor);
                table.addCell(gradeCell);
                alt = !alt;
            }

            doc.add(table);

            double classAvg = ml.stream().mapToDouble(x -> x.getAverage() != null ? x.getAverage() : 0).average().orElse(0);
            doc.add(new Paragraph(String.format("Class Average: %.2f  |  Students: %d", classAvg, ml.size()))
                    .setFont(bold).setFontSize(10).setFontColor(HEADER_COLOR).setMarginBottom(10));
        }

        doc.close();
        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────
    // SHARED HELPERS
    // ──────────────────────────────────────────────────────────────

    /** Adds Santa Ana school header with logo to any document */
    private void addSchoolHeader(Document doc, PdfFont bold, PdfFont regular) throws Exception {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{12, 88}))
                .setWidth(UnitValue.createPercentValue(100));

        try (InputStream logoStream = ReportService.class.getResourceAsStream("/static/school_logo.png")) {
            if (logoStream != null) {
                byte[] logoBytes = logoStream.readAllBytes();
                Image logo = new Image(ImageDataFactory.create(logoBytes)).setWidth(45).setHeight(45);
                headerTable.addCell(new Cell().add(logo)
                        .setBorder(Border.NO_BORDER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE));
            } else {
                headerTable.addCell(new Cell().setBorder(Border.NO_BORDER));
            }
        } catch (Exception ignored) {
            headerTable.addCell(new Cell().setBorder(Border.NO_BORDER));
        }

        headerTable.addCell(new Cell()
                .add(new Paragraph("SANTA ANA CALM WATERS ACADEMY")
                        .setFont(bold).setFontSize(14).setTextAlignment(TextAlignment.CENTER)
                        .setFontColor(HEADER_COLOR))
                .setBorder(Border.NO_BORDER));

        doc.add(headerTable);
    }

    private void addHeaderCell(Table table, String text, PdfFont font) {
        table.addHeaderCell(
            new Cell().add(new Paragraph(text).setFont(font).setFontSize(9))
                    .setBackgroundColor(HEADER_COLOR)
                    .setFontColor(ColorConstants.WHITE)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(5)
        );
    }

    private void addCell(Table table, String text, PdfFont font, DeviceRgb bg) {
        Cell cell = new Cell()
                .add(new Paragraph(text != null ? text : "-").setFont(font).setFontSize(9))
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPadding(4);
        if (bg != null) cell.setBackgroundColor(bg);
        table.addCell(cell);
    }

    private void addMarkCell(Table table, String text, PdfFont font, float fontSize,
                             DeviceRgb bg, TextAlignment align, float minHeight) {
        Cell cell = new Cell()
                .add(new Paragraph(text != null ? text : "").setFont(font).setFontSize(fontSize))
                .setTextAlignment(align)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPadding(4)
                .setMinHeight(minHeight);
        if (bg != null) cell.setBackgroundColor(bg);
        table.addCell(cell);
    }

    // Legacy overload without minHeight (used by other methods)
    private void addMarkCell(Table table, String text, PdfFont font, float fontSize,
                             DeviceRgb bg, TextAlignment align) {
        addMarkCell(table, text, font, fontSize, bg, align, 0);
    }

    /** Detailed CBC grade (EE1, EE2, ME1, ME2, AE1, AE2, BE1, BE2) */
    private String getDetailedGrade(double score) {
        if (score >= 90) return "EE1";
        if (score >= 75) return "EE2";
        if (score >= 58) return "ME1";
        if (score >= 41) return "ME2";
        if (score >= 31) return "AE1";
        if (score >= 21) return "AE2";
        if (score >= 11) return "BE1";
        return "BE2";
    }

    /** Simple CBC grade (EE, ME, AE, BE) for marklist/school report */
    private String getSimpleCbcGrade(double avg, int gradeLevel) {
        if (gradeLevel <= 3) {
            return avg >= 75 ? "EE" : avg >= 50 ? "ME" : avg >= 25 ? "AE" : "BE";
        }
        return avg >= 75 ? "EE" : avg >= 41 ? "ME" : avg >= 21 ? "AE" : "BE";
    }

    private DeviceRgb getGradeColor(String grade) {
        if (grade == null) return new DeviceRgb(0, 0, 0);
        if (grade.startsWith("EE")) return EE_COLOR;
        if (grade.startsWith("ME")) return ME_COLOR;
        if (grade.startsWith("AE")) return AE_COLOR;
        if (grade.startsWith("BE")) return BE_COLOR;
        return new DeviceRgb(0, 0, 0);
    }

    /** Returns display label for pre-primary levels */
    private String getLevelLabel(int gradeLevel) {
        if (gradeLevel == -1) return "PRE-PRIMARY ONE (PP1)";
        if (gradeLevel == 0)  return "PRE-PRIMARY TWO (PP2)";
        return "";
    }

    /** Auto-generates a relevant facilitator comment based on grade and level */
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