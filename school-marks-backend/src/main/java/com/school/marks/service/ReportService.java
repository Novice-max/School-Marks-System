package com.school.marks.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.*;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import com.school.marks.dto.StudentMarkSummaryDTO;
import com.school.marks.dto.SubjectMarkDTO;
import com.school.marks.model.*;
import com.school.marks.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final MarkService markService;
    private final ExamRepository examRepository;
    private final StudentRepository studentRepository;

    private static final DeviceRgb HEADER_COLOR  = new DeviceRgb(30, 90, 160);
    private static final DeviceRgb ALT_ROW_COLOR = new DeviceRgb(240, 245, 255);
    private static final DeviceRgb EE_COLOR      = new DeviceRgb(0, 150, 70);
    private static final DeviceRgb ME_COLOR      = new DeviceRgb(60, 130, 200);
    private static final DeviceRgb AE_COLOR      = new DeviceRgb(220, 150, 0);
    private static final DeviceRgb BE_COLOR      = new DeviceRgb(200, 50, 50);
    private final ClassRoomRepository classRoomRepository;
    
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
        pdf.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4.rotate()); // Landscape for wide tables
        Document doc = new Document(pdf);
        doc.setMargins(30, 30, 30, 30);

        PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

        // ── School header ──
        doc.add(new Paragraph("SCHOOL MARKS MANAGEMENT SYSTEM")
                .setFont(bold).setFontSize(14).setTextAlignment(TextAlignment.CENTER)
                .setFontColor(HEADER_COLOR));

        doc.add(new Paragraph(exam.getClassRoom().getDisplayName() + " — "
                + exam.getExamName() + " | Term " + exam.getTerm()
                + " | " + exam.getAcademicYear())
                .setFont(regular).setFontSize(11).setTextAlignment(TextAlignment.CENTER));

        doc.add(new Paragraph(" "));

        if (marklist.isEmpty()) {
            doc.add(new Paragraph("No marks entered for this exam.")
                    .setFont(regular).setFontSize(11));
            doc.close();
            return baos.toByteArray();
        }

        // Collect all subjects from first student
        List<SubjectMarkDTO> sampleSubjects = marklist.get(0).getSubjectMarks();
        int colCount = 3 + sampleSubjects.size() + 3; // pos + name + adm + subjects + total + avg + grade

        Table table = new Table(UnitValue.createPercentArray(colCount))
                .setWidth(UnitValue.createPercentValue(100));

        // ── Table headers ──
        String[] fixedHeaders = {"#", "Admission No.", "Student Name"};
        for (String h : fixedHeaders) addHeaderCell(table, h, bold);
        for (SubjectMarkDTO s : sampleSubjects) addHeaderCell(table, s.getSubjectName(), bold);
        for (String h : new String[]{"Total", "Average", "Overall"}) addHeaderCell(table, h, bold);

        // ── Table rows ──
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

            String overallGrade = calculateOverallCbcGrade(avg,
                    exam.getClassRoom().getGradeLevel());

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

        // ── Footer summary ──
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
    // INDIVIDUAL STUDENT MARKSHEET PDF
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
                .orElseThrow(() -> new RuntimeException("No marks for this student"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf);
        doc.setMargins(50, 50, 50, 50);

        PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

        // ── Header ──
        doc.add(new Paragraph("STUDENT REPORT CARD")
                .setFont(bold).setFontSize(16).setTextAlignment(TextAlignment.CENTER)
                .setFontColor(HEADER_COLOR));
        doc.add(new Paragraph(exam.getExamName() + " — Term " + exam.getTerm()
                + " — " + exam.getAcademicYear())
                .setFont(regular).setFontSize(11).setTextAlignment(TextAlignment.CENTER));

        doc.add(new Paragraph("─".repeat(80)).setFontSize(8));

        // ── Student details ──
        Table info = new Table(UnitValue.createPercentArray(new float[]{2, 3, 2, 3}))
                .setWidth(UnitValue.createPercentValue(100));

        addInfoRow(info, "Name:", student.getFullName(), "Adm. No.:", student.getAdmissionNumber(), bold, regular);
        addInfoRow(info, "Class:", exam.getClassRoom().getDisplayName(),
                "Position:", studentData.getPosition() + " / " + marklist.size(), bold, regular);
        doc.add(info);

        doc.add(new Paragraph(" "));

        // ── Marks table ──
        Table marks = new Table(UnitValue.createPercentArray(new float[]{4, 2, 1.5f, 1.5f}))
                .setWidth(UnitValue.createPercentValue(100));

        for (String h : new String[]{"Subject", "Score", "Grade", "Points"}) {
            marks.addHeaderCell(new Cell().add(new Paragraph(h).setFont(bold).setFontSize(10))
                    .setBackgroundColor(HEADER_COLOR).setFontColor(ColorConstants.WHITE)
                    .setTextAlignment(TextAlignment.CENTER).setPadding(6));
        }

        boolean alt = false;
        for (SubjectMarkDTO sm : studentData.getSubjectMarks()) {
            DeviceRgb rowColor = alt ? ALT_ROW_COLOR : null;
            addCell(marks, sm.getSubjectName(), regular, rowColor);

            Cell scoreCell = new Cell().add(new Paragraph(
                    sm.getScore() != null ? sm.getScore().toPlainString() : "-")
                    .setFont(regular).setFontSize(10))
                    .setTextAlignment(TextAlignment.CENTER).setPadding(5);
            if (rowColor != null) scoreCell.setBackgroundColor(rowColor);
            marks.addCell(scoreCell);

            Cell gradeCell = new Cell().add(new Paragraph(
                    sm.getGrade() != null ? sm.getGrade() : "-")
                    .setFont(bold).setFontSize(10).setFontColor(getGradeColor(sm.getGrade())))
                    .setTextAlignment(TextAlignment.CENTER).setPadding(5);
            if (rowColor != null) gradeCell.setBackgroundColor(rowColor);
            marks.addCell(gradeCell);

            addCell(marks, sm.getGradePoints() != null ? String.valueOf(sm.getGradePoints()) : "-",
                    regular, rowColor);
            alt = !alt;
        }

        doc.add(marks);
        doc.add(new Paragraph(" "));

        // ── Summary ──
        double avg = studentData.getAverage() != null ? studentData.getAverage() : 0;
        String overall = calculateOverallCbcGrade(avg, exam.getClassRoom().getGradeLevel());

        Table summary = new Table(UnitValue.createPercentArray(new float[]{2, 1, 2, 1, 2, 1}))
                .setWidth(UnitValue.createPercentValue(100));

        addInfoRow(summary, "Total Score:", String.format("%.1f", studentData.getTotalScore()),
                "Average:", String.format("%.2f%%", avg),
                "Overall Grade:", overall, bold, regular);
        doc.add(summary);

        doc.add(new Paragraph(" ").setMarginTop(20));
        doc.add(new Paragraph("Class Teacher's Signature: ___________________________    Date: _______________")
                .setFont(regular).setFontSize(10));

        doc.close();
        return baos.toByteArray();
    }

    // ── Helpers ──

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

    private void addInfoRow(Table table, String l1, String v1, String l2, String v2,
                            PdfFont bold, PdfFont regular) {
        table.addCell(new Cell().add(new Paragraph(l1).setFont(bold).setFontSize(10)).setBorder(null));
        table.addCell(new Cell().add(new Paragraph(v1).setFont(regular).setFontSize(10)).setBorder(null));
        table.addCell(new Cell().add(new Paragraph(l2).setFont(bold).setFontSize(10)).setBorder(null));
        table.addCell(new Cell().add(new Paragraph(v2).setFont(regular).setFontSize(10)).setBorder(null));
    }

    private void addInfoRow(Table t, String l1, String v1, String l2, String v2,
                            String l3, String v3, PdfFont bold, PdfFont regular) {
        t.addCell(new Cell().add(new Paragraph(l1).setFont(bold).setFontSize(10)).setBorder(null));
        t.addCell(new Cell().add(new Paragraph(v1).setFont(regular).setFontSize(10)).setBorder(null));
        t.addCell(new Cell().add(new Paragraph(l2).setFont(bold).setFontSize(10)).setBorder(null));
        t.addCell(new Cell().add(new Paragraph(v2).setFont(regular).setFontSize(10)).setBorder(null));
        t.addCell(new Cell().add(new Paragraph(l3).setFont(bold).setFontSize(10)).setBorder(null));
        t.addCell(new Cell().add(new Paragraph(v3).setFont(bold).setFontSize(10)
                .setFontColor(getGradeColor(v3))).setBorder(null));
    }

   private DeviceRgb getGradeColor(String grade) {
    if (grade == null) return new DeviceRgb(0, 0, 0);
    return switch (grade) {
        case "EE" -> EE_COLOR;
        case "ME" -> ME_COLOR;
        case "AE" -> AE_COLOR;
        case "BE" -> BE_COLOR;
        default   -> new DeviceRgb(0, 0, 0);
    };
}

    private String calculateOverallCbcGrade(double avg, int gradeLevel) {
        BigDecimal score = BigDecimal.valueOf(avg);
        return gradeLevel <= 3
                ? (avg >= 75 ? "EE" : avg >= 50 ? "ME" : avg >= 25 ? "AE" : "BE")
                : (avg >= 80 ? "EE" : avg >= 60 ? "ME" : avg >= 40 ? "AE" : "BE");
    }
    public byte[] generateSchoolReportPdf(String academicYear, Integer term, String examName) throws Exception {
    // Get all classes
    List<com.school.marks.model.ClassRoom> classes = classRoomRepository.findByAcademicYear(academicYear);

    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    PdfWriter writer = new PdfWriter(baos);
    PdfDocument pdf = new PdfDocument(writer);
    pdf.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4.rotate());
    Document doc = new Document(pdf);
    doc.setMargins(30, 30, 30, 30);

    PdfFont bold    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
    PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

    // School header
    doc.add(new Paragraph("SCHOOL MARKS MANAGEMENT SYSTEM")
            .setFont(bold).setFontSize(16).setTextAlignment(TextAlignment.CENTER)
            .setFontColor(HEADER_COLOR));
    doc.add(new Paragraph("School-Wide Report — " + examName + " | Term " + term + " | " + academicYear)
            .setFont(regular).setFontSize(12).setTextAlignment(TextAlignment.CENTER));
    doc.add(new Paragraph(" "));

    if (classes.isEmpty()) {
        doc.add(new Paragraph("No classes found for " + academicYear).setFont(regular));
        doc.close();
        return baos.toByteArray();
    }

    for (com.school.marks.model.ClassRoom classRoom : classes) {
        // Find exam for this class
        List<com.school.marks.model.Exam> exams = examRepository
            .findByClassRoom_ClassIdAndTermAndAcademicYear(classRoom.getClassId(), term, academicYear);
        
        java.util.Optional<com.school.marks.model.Exam> examOpt = exams.stream()
            .filter(e -> e.getExamName().equalsIgnoreCase(examName))
            .findFirst();

        if (examOpt.isEmpty()) continue;

        List<com.school.marks.dto.StudentMarkSummaryDTO> marklist = 
            markService.getClassMarkList(examOpt.get().getExamId());

        if (marklist.isEmpty()) continue;

        // Class header
        doc.add(new Paragraph(classRoom.getDisplayName())
                .setFont(bold).setFontSize(13).setFontColor(HEADER_COLOR).setMarginTop(10));

        Table table = new Table(UnitValue.createPercentArray(new float[]{1,2,3,2,1,1,1}))
                .setWidth(UnitValue.createPercentValue(100));

        for (String h : new String[]{"#","Adm No.","Name","Subjects Sat","Total","Average","Grade"}) {
            addHeaderCell(table, h, bold);
        }

        boolean alt = false;
        for (com.school.marks.dto.StudentMarkSummaryDTO st : marklist) {
            DeviceRgb rowColor = alt ? ALT_ROW_COLOR : null;
            addCell(table, String.valueOf(st.getPosition()), regular, rowColor);
            addCell(table, st.getAdmissionNumber(), regular, rowColor);
            addCell(table, st.getFullName(), regular, rowColor);
            addCell(table, String.valueOf(st.getSubjectMarks().size()), regular, rowColor);
            addCell(table, String.format("%.1f", st.getTotalScore()), regular, rowColor);
            addCell(table, String.format("%.2f", st.getAverage()), regular, rowColor);
            String grade = classRoom.getGradeLevel() <= 3
                ? (st.getAverage() >= 75 ? "EE" : st.getAverage() >= 50 ? "ME" : st.getAverage() >= 25 ? "AE" : "BE")
                : (st.getAverage() >= 80 ? "EE" : st.getAverage() >= 60 ? "ME" : st.getAverage() >= 40 ? "AE" : "BE");
            Cell gradeCell = new Cell().add(new Paragraph(grade).setFont(bold).setFontSize(9).setFontColor(getGradeColor(grade)))
                    .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE);
            if (rowColor != null) gradeCell.setBackgroundColor(rowColor);
            table.addCell(gradeCell);
            alt = !alt;
        }

        doc.add(table);

        double classAvg = marklist.stream().mapToDouble(x -> x.getAverage() != null ? x.getAverage() : 0).average().orElse(0);
        doc.add(new Paragraph(String.format("Class Average: %.2f  |  Students: %d", classAvg, marklist.size()))
                .setFont(bold).setFontSize(10).setFontColor(HEADER_COLOR).setMarginBottom(10));
    }

    doc.close();
    return baos.toByteArray();
}

}
