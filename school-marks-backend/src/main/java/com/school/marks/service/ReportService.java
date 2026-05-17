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
import java.util.*;
import java.util.stream.Collectors;
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

    /* ── Inner holders for dynamic exam slots ── */
    private static class ExamSlot {
        final String header;
        final Map<String, BigDecimal> marks;
        ExamSlot(String h, Map<String, BigDecimal> m) { header = h; marks = m; }
    }
    private static class BatchExamSlot {
        final String header;
        final Map<Long, Map<String, BigDecimal>> allMarks;
        BatchExamSlot(String h, Map<Long, Map<String, BigDecimal>> m) { header = h; allMarks = m; }
    }

    // ══════════════════════════════════════════════════════════════
    //  CLASS MARKLIST PDF
    //  FIX: collect ALL subjects across ALL students, then look up
    //       each student's mark by name so missing marks get "-"
    //       instead of shifting the entire row sideways.
    // ══════════════════════════════════════════════════════════════
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
        doc.add(new Paragraph(exam.getClassRoom().getDisplayName() + " \u2014 "
                + exam.getExamName() + " | Term " + exam.getTerm() + " | " + exam.getAcademicYear())
                .setFont(regular).setFontSize(11).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(" "));

        if (marklist.isEmpty()) {
            doc.add(new Paragraph("No marks entered for this exam.").setFont(regular).setFontSize(11));
            doc.close();
            return baos.toByteArray();
        }

        // ── Collect ALL unique subject names across ALL students ──
        LinkedHashSet<String> subjectSet = new LinkedHashSet<>();
        for (StudentMarkSummaryDTO s : marklist)
            for (SubjectMarkDTO sm : s.getSubjectMarks())
                subjectSet.add(sm.getSubjectName());
        List<String> allSubjects = new ArrayList<>(subjectSet);
        int subjectCount = allSubjects.size();

        // ── Proportional column widths ──
        float[] colWidths = new float[3 + subjectCount + 3];
        colWidths[0] = 3;   // #
        colWidths[1] = 7;   // Adm No.
        colWidths[2] = 11;  // Student Name
        float perSubject = (100f - 36f) / subjectCount;
        for (int i = 0; i < subjectCount; i++) colWidths[3 + i] = perSubject;
        colWidths[3 + subjectCount]     = 5; // Total
        colWidths[3 + subjectCount + 1] = 5; // Average
        colWidths[3 + subjectCount + 2] = 5; // Overall

        Table table = new Table(UnitValue.createPercentArray(colWidths))
                .setWidth(UnitValue.createPercentValue(100));

        float cf = subjectCount > 8 ? 7f : subjectCount > 6 ? 8f : 9f;

        // ── Header row ──
        addHeaderCell(table, "#", bold, cf);
        addHeaderCell(table, "Adm No.", bold, cf);
        addHeaderCell(table, "Student Name", bold, cf);
        for (String subName : allSubjects) addHeaderCell(table, subName, bold, cf);
        addHeaderCell(table, "Total", bold, cf);
        addHeaderCell(table, "Average", bold, cf);
        addHeaderCell(table, "Overall", bold, cf);

        // ── Data rows ──
        boolean alt = false;
        for (StudentMarkSummaryDTO student : marklist) {
            DeviceRgb rc = alt ? ALT_ROW_COLOR : null;
            addCell(table, String.valueOf(student.getPosition()), regular, rc, cf);
            addCell(table, student.getAdmissionNumber(), regular, rc, cf);
            addCell(table, student.getFullName(), regular, rc, cf);

            // Build lookup map: subjectName -> SubjectMarkDTO
            Map<String, SubjectMarkDTO> markMap = new HashMap<>();
            for (SubjectMarkDTO sm : student.getSubjectMarks())
                markMap.put(sm.getSubjectName(), sm);

            double totalPoints = 0; int counted = 0;

            // Iterate over ALL subjects in header order
            for (String subName : allSubjects) {
                SubjectMarkDTO sm = markMap.get(subName);
                if (sm != null && sm.getScore() != null) {
                    Cell cell = new Cell().add(new Paragraph(sm.getScore().toPlainString())
                            .setFont(regular).setFontSize(cf))
                            .setTextAlignment(TextAlignment.CENTER)
                            .setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(3);
                    if (rc != null) cell.setBackgroundColor(rc);
                    if (sm.getGrade() != null) cell.setFontColor(getGradeColor(sm.getGrade()));
                    table.addCell(cell);
                    totalPoints += sm.getScore().doubleValue(); counted++;
                } else {
                    addCell(table, "-", regular, rc, cf);
                }
            }

            double avg = counted > 0 ? BigDecimal.valueOf(totalPoints / counted)
                    .setScale(2, RoundingMode.HALF_UP).doubleValue() : 0;
            String overallGrade = getGrade(avg);
            addCell(table, String.format("%.1f", totalPoints), regular, rc, cf);
            addCell(table, String.format("%.2f", avg), regular, rc, cf);
            Cell gc = new Cell().add(new Paragraph(overallGrade).setFont(bold).setFontSize(cf))
                    .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setFontColor(getGradeColor(overallGrade)).setPadding(3);
            if (rc != null) gc.setBackgroundColor(rc);
            table.addCell(gc);
            alt = !alt;
        }
        doc.add(table);

        double classAvg = marklist.stream().mapToDouble(s -> s.getAverage() != null ? s.getAverage() : 0).average().orElse(0);
        doc.add(new Paragraph("Class Average: " + BigDecimal.valueOf(classAvg).setScale(2, RoundingMode.HALF_UP)
                + "  |  Total Students: " + marklist.size()).setFont(bold).setFontSize(10).setFontColor(HEADER_COLOR));
        doc.close();
        return baos.toByteArray();
    }

    // ══════════════════════════════════════════════════════════════
    //  LEGACY SINGLE-EXAM MARKSHEET  (unchanged)
    // ══════════════════════════════════════════════════════════════
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
        String ll = getLevelLabel(gl);
        if (!ll.isEmpty()) doc.add(new Paragraph(ll).setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.CENTER).setMarginTop(2));
        buildNameGradeRow(doc, bold, student.getFullName(), gl == -1 ? "PP1" : gl == 0 ? "PP2" : "GRADE " + gl);

        String enl = exam.getExamName().toLowerCase();
        boolean isMid = enl.contains("mid") || enl.contains("opener");
        boolean isEnd = enl.contains("end");

        int st = studentData.getSubjectMarks().size();
        float rh = rowHeight(st), bf = bodyFont(st), hf = headerFont(st);
        Table mt = buildLegacyTableHeader(bf, hf);

        double ts = 0; int sc = 0; boolean alt = false;
        for (SubjectMarkDTO sm : studentData.getSubjectMarks()) {
            DeviceRgb rb = alt ? ALT_ROW_COLOR : null;
            String ss = sm.getScore() != null ? sm.getScore().toPlainString() : "";
            double sv = sm.getScore() != null ? sm.getScore().doubleValue() : 0;
            String lv = sm.getScore() != null ? getGrade(sv) : "";

            addMarkCell(mt, sm.getSubjectName(), regular, bf, rb, TextAlignment.LEFT, rh);
            if (isMid) {
                addMarkCell(mt, ss, regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, lv, bold, bf-1, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, "", regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, "", regular, bf-1, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, ss, regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, lv, bold, bf-1, rb, TextAlignment.CENTER, rh);
            } else if (isEnd) {
                addMarkCell(mt, "", regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, "", regular, bf-1, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, ss, regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, lv, bold, bf-1, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, ss, regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, lv, bold, bf-1, rb, TextAlignment.CENTER, rh);
            } else {
                addMarkCell(mt, ss, regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, lv, bold, bf-1, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, ss, regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, lv, bold, bf-1, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, ss, regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, lv, bold, bf-1, rb, TextAlignment.CENTER, rh);
            }
            if (sm.getScore() != null) { ts += sv; sc++; }
            alt = !alt;
        }

        double av = sc > 0 ? ts / sc : 0;
        String tstr = sc > 0 ? String.format("%.0f", ts) : "";
        String astr = sc > 0 ? String.format("%.1f", av) : "";
        String alvl = sc > 0 ? getGrade(av) : "";

        mt.addCell(new Cell().add(new Paragraph("TOTAL").setFont(bold).setFontSize(bf)).setBackgroundColor(TOTAL_ROW_BG).setPadding(6).setMinHeight(rh));
        if (isMid) {
            addMarkCell(mt, tstr, bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, "", bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, "", bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, "", bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, astr, bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, alvl, bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
        } else if (isEnd) {
            addMarkCell(mt, "", bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, "", bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, tstr, bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, "", bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, astr, bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, alvl, bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
        } else {
            addMarkCell(mt, tstr, bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, "", bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, tstr, bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, "", bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, astr, bold, bf, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
            addMarkCell(mt, alvl, bold, bf-1, TOTAL_ROW_BG, TextAlignment.CENTER, rh);
        }
        doc.add(mt);
        buildRubric(doc, bold, regular);
        doc.add(new Paragraph("FACILITATOR'S COMMENT:  " + generateFacilitatorComment(student.getFirstName(), alvl, gl)).setFont(regular).setFontSize(9).setMarginTop(8));
        buildSignatures(doc, bold, regular);
        buildDates(doc, regular);
        doc.close();
        return baos.toByteArray();
    }

    // ══════════════════════════════════════════════════════════════
    //  COMBINED TERM REPORT — DYNAMIC 1/2/3 EXAMS
    // ══════════════════════════════════════════════════════════════
    public byte[] generateTermReportPdf(Long studentId, Long classId, Integer term, String academicYear) throws Exception {
        Student student = studentRepository.findById(studentId).orElseThrow(() -> new RuntimeException("Student not found"));
        ClassRoom classRoom = classRoomRepository.findById(classId).orElseThrow(() -> new RuntimeException("Class not found"));
        List<Exam> allExams = examRepository.findByClassRoom_ClassIdAndTermAndAcademicYear(classId, term, academicYear);
        List<ExamSlot> slots = detectExamSlots(allExams, studentId);
        if (slots.isEmpty()) throw new RuntimeException("No exams found for Term " + term + " " + academicYear);

        List<Subject> subjects = subjectRepository.findByLevelType(classRoom.getLevelType());
        int sTotal = subjects.size();
        float rh = rowHeight(sTotal), bf = bodyFont(sTotal), hf = headerFont(sTotal);
        int gl = classRoom.getGradeLevel();
        String ll = getLevelLabel(gl);

        float ch = 70+30+(ll.isEmpty()?0:15)+20+40+(sTotal*rh)+rh+10+40+20+40+25;
        float am = Math.max((842f-ch)/2f, 18f);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdf);
        doc.setMargins(Math.min(am,36f), 36, Math.min(am,36f), 36);

        PdfFont bold = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
        PdfFont italic = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_OBLIQUE);

        buildReportHeader(doc, bold, regular, italic);
        doc.add(new Paragraph("SCHOOL BASED TERM " + term + " ASSESSMENT REPORT YEAR " + academicYear)
                .setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.CENTER)
                .setBorder(new SolidBorder(ColorConstants.BLACK, 1.5f)).setPadding(5).setMarginTop(8));
        if (!ll.isEmpty()) doc.add(new Paragraph(ll).setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.CENTER).setMarginTop(2));
        buildNameGradeRow(doc, bold, student.getFullName(), gl==-1?"PP1":gl==0?"PP2":"GRADE "+gl);

        List<String> headers = slots.stream().map(s->s.header).collect(Collectors.toList());
        Table mt = buildDynamicTableHeader(headers, bf, hf);

        boolean alt = false;
        double[] sTotals = new double[slots.size()]; int[] sCounts = new int[slots.size()];
        double tAvg = 0; int aC = 0;

        for (Subject sub : subjects) {
            DeviceRgb rb = alt ? ALT_ROW_COLOR : null;
            addMarkCell(mt, sub.getSubjectName(), regular, bf, rb, TextAlignment.LEFT, rh);
            double sA = 0; int sN = 0;
            for (int i = 0; i < slots.size(); i++) {
                BigDecimal score = slots.get(i).marks.get(sub.getSubjectName());
                addMarkCell(mt, score!=null?score.toPlainString():"", regular, bf, rb, TextAlignment.CENTER, rh);
                addMarkCell(mt, score!=null?getGrade(score.doubleValue()):"", bold, bf-1, rb, TextAlignment.CENTER, rh);
                if (score!=null) { sTotals[i]+=score.doubleValue(); sCounts[i]++; sA+=score.doubleValue(); sN++; }
            }
            if (sN>0) { double a=sA/sN; addMarkCell(mt,String.format("%.1f",a),regular,bf,rb,TextAlignment.CENTER,rh); addMarkCell(mt,getGrade(a),bold,bf-1,rb,TextAlignment.CENTER,rh); tAvg+=a; aC++; }
            else { addMarkCell(mt,"",regular,bf,rb,TextAlignment.CENTER,rh); addMarkCell(mt,"",bold,bf-1,rb,TextAlignment.CENTER,rh); }
            alt = !alt;
        }

        mt.addCell(new Cell().add(new Paragraph("TOTAL").setFont(bold).setFontSize(bf)).setBackgroundColor(TOTAL_ROW_BG).setPadding(4).setMinHeight(rh));
        for (int i=0;i<slots.size();i++) { addMarkCell(mt,sCounts[i]>0?String.format("%.0f",sTotals[i]):"",bold,bf,TOTAL_ROW_BG,TextAlignment.CENTER,rh); addMarkCell(mt,"",bold,bf-1,TOTAL_ROW_BG,TextAlignment.CENTER,rh); }
        double oAvg = aC>0?tAvg/aC:0;
        addMarkCell(mt,aC>0?String.format("%.1f",oAvg):"",bold,bf,TOTAL_ROW_BG,TextAlignment.CENTER,rh);
        addMarkCell(mt,aC>0?getGrade(oAvg):"",bold,bf-1,TOTAL_ROW_BG,TextAlignment.CENTER,rh);

        doc.add(mt);
        buildRubric(doc, bold, regular);
        doc.add(new Paragraph("FACILITATOR'S COMMENT:  "+generateFacilitatorComment(student.getFirstName(),aC>0?getGrade(oAvg):"ME1",gl)).setFont(regular).setFontSize(9).setMarginTop(8));
        buildSignatures(doc, bold, regular);
        buildDates(doc, regular);
        doc.close();
        return baos.toByteArray();
    }

    // ══════════════════════════════════════════════════════════════
    //  ALL TERM REPORTS FOR A CLASS — DYNAMIC 1/2/3 EXAMS
    // ══════════════════════════════════════════════════════════════
    public byte[] generateAllTermReportsPdf(Long classId, Integer term, String academicYear) throws Exception {
        ClassRoom classRoom = classRoomRepository.findById(classId).orElseThrow(() -> new RuntimeException("Class not found"));
        List<Student> students = studentRepository.findByClassRoom_ClassIdAndIsActiveTrue(classId);
        if (students.isEmpty()) throw new RuntimeException("No active students in this class");
        students.sort((a,b)->{ int c=a.getLastName().compareToIgnoreCase(b.getLastName()); return c!=0?c:a.getFirstName().compareToIgnoreCase(b.getFirstName()); });

        List<Subject> subjects = subjectRepository.findByLevelType(classRoom.getLevelType());
        int sTotal = subjects.size();
        List<Exam> allExams = examRepository.findByClassRoom_ClassIdAndTermAndAcademicYear(classId, term, academicYear);
        List<BatchExamSlot> bSlots = detectBatchExamSlots(allExams);
        if (bSlots.isEmpty()) throw new RuntimeException("No exams found for Term " + term + " " + academicYear);

        byte[] logoBytes = null;
        try (InputStream ls = ReportService.class.getResourceAsStream("/static/school_logo.png")) { if (ls!=null) logoBytes=ls.readAllBytes(); } catch (Exception ignored){}

        PdfFont bold = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
        PdfFont italic = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_OBLIQUE);

        float rh=rowHeight(sTotal), bf=bodyFont(sTotal), hf=headerFont(sTotal);
        int gl=classRoom.getGradeLevel(); String ll=getLevelLabel(gl);
        String gLabel = gl==-1?"PP1":gl==0?"PP2":"GRADE "+gl;
        float ch=70+30+(ll.isEmpty()?0:15)+20+40+(sTotal*rh)+rh+10+40+20+40+25;
        float am=Math.max((842f-ch)/2f,18f); float tm=Math.min(am,36f), bm=Math.min(am,36f);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdf, com.itextpdf.kernel.geom.PageSize.A4);
        doc.setMargins(tm, 36, bm, 36);

        List<String> examHeaders = bSlots.stream().map(s->s.header).collect(Collectors.toList());
        int count = 0;

        for (Student student : students) {
            List<Map<String,BigDecimal>> sMaps = new ArrayList<>();
            for (BatchExamSlot bs : bSlots) sMaps.add(bs.allMarks.getOrDefault(student.getStudentId(), Collections.emptyMap()));

            boolean hasAny = false;
            outer: for (Subject sub : subjects) for (Map<String,BigDecimal> m : sMaps) if (m.containsKey(sub.getSubjectName())) { hasAny=true; break outer; }
            if (!hasAny) continue;

            if (count>0) doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));

            // Header
            Table ht = new Table(UnitValue.createPercentArray(new float[]{18,82})).setWidth(UnitValue.createPercentValue(100));
            if (logoBytes!=null) {
                Image logo = new Image(ImageDataFactory.create(logoBytes)).setWidth(52).setHeight(52);
                ht.addCell(new Cell().add(logo).setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE).setHorizontalAlignment(HorizontalAlignment.CENTER));
            } else ht.addCell(new Cell().setBorder(Border.NO_BORDER));
            ht.addCell(new Cell()
                .add(new Paragraph("SANTA ANA CALM WATERS ACADEMY").setFont(bold).setFontSize(12).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("PO BOX 65039 - 00618 Ruaraka").setFont(regular).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("Contact: 0722479793/0113581219/0737107950").setFont(regular).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("Email: calmwaters91@gmail.com").setFont(regular).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("MOTTO: SERVING GOD & HUMANITY THROUGH EDUCATION").setFont(italic).setFontSize(6).setTextAlignment(TextAlignment.CENTER))
                .setBorder(Border.NO_BORDER));
            doc.add(ht);

            doc.add(new Paragraph("SCHOOL BASED TERM "+term+" ASSESSMENT REPORT YEAR "+academicYear)
                .setFont(bold).setFontSize(9).setTextAlignment(TextAlignment.CENTER)
                .setBorder(new SolidBorder(ColorConstants.BLACK,1.2f)).setPadding(4).setMarginTop(6));
            if (!ll.isEmpty()) doc.add(new Paragraph(ll).setFont(bold).setFontSize(9).setTextAlignment(TextAlignment.CENTER).setMarginTop(1));

            Table ng = new Table(UnitValue.createPercentArray(new float[]{70,30})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(5);
            ng.addCell(new Cell().add(new Paragraph("LEARNER'S NAME:  "+student.getFullName().toUpperCase()).setFont(bold).setFontSize(9)).setBorder(Border.NO_BORDER));
            ng.addCell(new Cell().add(new Paragraph(gLabel).setFont(bold).setFontSize(9).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));
            doc.add(ng);

            // Dynamic marks table
            Table mt = buildDynamicTableHeader(examHeaders, bf, hf);
            boolean alt = false;
            double[] sTotals = new double[bSlots.size()]; int[] sCounts = new int[bSlots.size()];
            double tAvg = 0; int aC = 0;

            for (Subject sub : subjects) {
                DeviceRgb rb = alt?ALT_ROW_COLOR:null;
                addMarkCell(mt, sub.getSubjectName(), regular, bf, rb, TextAlignment.LEFT, rh);
                double sA=0; int sN=0;
                for (int i=0;i<bSlots.size();i++) {
                    BigDecimal score = sMaps.get(i).get(sub.getSubjectName());
                    addMarkCell(mt, score!=null?score.toPlainString():"", regular, bf, rb, TextAlignment.CENTER, rh);
                    addMarkCell(mt, score!=null?getGrade(score.doubleValue()):"", bold, bf-1, rb, TextAlignment.CENTER, rh);
                    if (score!=null) { sTotals[i]+=score.doubleValue(); sCounts[i]++; sA+=score.doubleValue(); sN++; }
                }
                if (sN>0) { double a=sA/sN; addMarkCell(mt,String.format("%.1f",a),regular,bf,rb,TextAlignment.CENTER,rh); addMarkCell(mt,getGrade(a),bold,bf-1,rb,TextAlignment.CENTER,rh); tAvg+=a; aC++; }
                else { addMarkCell(mt,"",regular,bf,rb,TextAlignment.CENTER,rh); addMarkCell(mt,"",bold,bf-1,rb,TextAlignment.CENTER,rh); }
                alt = !alt;
            }

            mt.addCell(new Cell().add(new Paragraph("TOTAL").setFont(bold).setFontSize(bf)).setBackgroundColor(TOTAL_ROW_BG).setPadding(4).setMinHeight(rh));
            for (int i=0;i<bSlots.size();i++) { addMarkCell(mt,sCounts[i]>0?String.format("%.0f",sTotals[i]):"",bold,bf,TOTAL_ROW_BG,TextAlignment.CENTER,rh); addMarkCell(mt,"",bold,bf-1,TOTAL_ROW_BG,TextAlignment.CENTER,rh); }
            double oAvg=aC>0?tAvg/aC:0;
            addMarkCell(mt,aC>0?String.format("%.1f",oAvg):"",bold,bf,TOTAL_ROW_BG,TextAlignment.CENTER,rh);
            addMarkCell(mt,aC>0?getGrade(oAvg):"",bold,bf-1,TOTAL_ROW_BG,TextAlignment.CENTER,rh);
            doc.add(mt);

            // Rubric
            doc.add(new Paragraph(" ").setMarginTop(6).setFontSize(2));
            Table rub = new Table(UnitValue.createPercentArray(new float[]{14,11,11,11,11,11,11,11,9})).setWidth(UnitValue.createPercentValue(100));
            for (String l : new String[]{"RUBRIC","EE 1","EE 2","ME 1","ME 2","AE 1","AE 2","BE 1","BE 2"})
                rub.addCell(new Cell().add(new Paragraph(l).setFont(bold).setFontSize(8)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(3));
            for (String m : new String[]{"MARK","90-100","75-89","58-74","41-57","31-40","21-30","11-20","1-10"})
                rub.addCell(new Cell().add(new Paragraph(m).setFont(regular).setFontSize(8)).setTextAlignment(TextAlignment.CENTER).setPadding(3));
            doc.add(rub);

            doc.add(new Paragraph("FACILITATOR'S COMMENT:  "+generateFacilitatorComment(student.getFirstName(),aC>0?getGrade(oAvg):"ME1",gl)).setFont(regular).setFontSize(8).setMarginTop(8));

            Table sig = new Table(UnitValue.createPercentArray(new float[]{40,35,25})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(14);
            sig.addCell(new Cell().add(new Paragraph("HEAD TEACHER'S SIGNATURE:").setFont(bold).setFontSize(7)).add(new Paragraph(" ").setFontSize(4)).add(new Paragraph("________________________________").setFont(regular).setFontSize(8)).setBorder(Border.NO_BORDER));
            sig.addCell(new Cell().add(new Paragraph("CLASS TEACHER'S SIGNATURE:").setFont(bold).setFontSize(7)).add(new Paragraph(" ").setFontSize(4)).add(new Paragraph("______________________").setFont(regular).setFontSize(8)).setBorder(Border.NO_BORDER));
            sig.addCell(new Cell().add(new Paragraph("DATE:").setFont(bold).setFontSize(7)).add(new Paragraph(" ").setFontSize(4)).add(new Paragraph("_________________").setFont(regular).setFontSize(8)).setBorder(Border.NO_BORDER));
            doc.add(sig);

            Table dt = new Table(UnitValue.createPercentArray(new float[]{50,50})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(6);
            dt.addCell(new Cell().add(new Paragraph("CLOSING DATE:  ________________________").setFont(regular).setFontSize(8)).setBorder(Border.NO_BORDER));
            dt.addCell(new Cell().add(new Paragraph("OPENING DATE:  ________________________").setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));
            doc.add(dt);
            count++;
        }
        if (count==0) throw new RuntimeException("No report cards could be generated \u2014 ensure marks are entered");
        doc.close();
        return baos.toByteArray();
    }

    // ══════════════════════════════════════════════════════════════
    //  SCHOOL-WIDE REPORT  (unchanged)
    // ══════════════════════════════════════════════════════════════
    public byte[] generateSchoolReportPdf(String academicYear, Integer term, String examName) throws Exception {
        List<ClassRoom> classes = classRoomRepository.findByAcademicYear(academicYear);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
        pdf.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4.rotate());
        Document doc = new Document(pdf); doc.setMargins(30,30,30,30);

        PdfFont bold = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
        addSchoolHeader(doc, bold, regular);
        doc.add(new Paragraph("School-Wide Report \u2014 "+examName+" | Term "+term+" | "+academicYear).setFont(regular).setFontSize(12).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(" "));
        if (classes.isEmpty()) { doc.add(new Paragraph("No classes found for "+academicYear).setFont(regular)); doc.close(); return baos.toByteArray(); }

        for (ClassRoom cr : classes) {
            List<Exam> exams = examRepository.findByClassRoom_ClassIdAndTermAndAcademicYear(cr.getClassId(), term, academicYear);
            Optional<Exam> eo = exams.stream().filter(e->e.getExamName().equalsIgnoreCase(examName)).findFirst();
            if (eo.isEmpty()) continue;
            List<StudentMarkSummaryDTO> ml = markService.getClassMarkList(eo.get().getExamId());
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
                String g = getGrade(s.getAverage());
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
        return t;
    }

    private Table buildLegacyTableHeader(float bf, float hf) throws Exception {
        Table t = new Table(UnitValue.createPercentArray(new float[]{30,10,10,10,10,15,15})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(8);
        PdfFont hb = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        t.addHeaderCell(new Cell(2,1).add(new Paragraph("LEARNING AREAS").setFont(hb).setFontSize(hf)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(6));
        t.addHeaderCell(new Cell(1,2).add(new Paragraph("MID TERM").setFont(hb).setFontSize(hf)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(6));
        t.addHeaderCell(new Cell(1,2).add(new Paragraph("END TERM").setFont(hb).setFontSize(hf)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(6));
        t.addHeaderCell(new Cell(1,2).add(new Paragraph("TERMLY AVERAGE").setFont(hb).setFontSize(hf)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(6));
        for (String s : new String[]{"MARKS","LEVEL","MARKS","LEVEL","MARKS","LEVEL"})
            t.addHeaderCell(new Cell().add(new Paragraph(s).setFont(hb).setFontSize(hf-1)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
        return t;
    }

    // ══════════════════════════════════════════════════════════════
    //  SHARED BUILDERS
    // ══════════════════════════════════════════════════════════════
    private void buildReportHeader(Document doc, PdfFont bold, PdfFont regular, PdfFont italic) throws Exception {
        Table ht = new Table(UnitValue.createPercentArray(new float[]{18,82})).setWidth(UnitValue.createPercentValue(100));
        try (InputStream ls = ReportService.class.getResourceAsStream("/static/school_logo.png")) {
            if (ls!=null) { ht.addCell(new Cell().add(new Image(ImageDataFactory.create(ls.readAllBytes())).setWidth(58).setHeight(58)).setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE).setHorizontalAlignment(HorizontalAlignment.CENTER)); }
            else ht.addCell(new Cell().setBorder(Border.NO_BORDER));
        } catch (Exception ignored) { ht.addCell(new Cell().setBorder(Border.NO_BORDER)); }
        ht.addCell(new Cell()
            .add(new Paragraph("SANTA ANA CALM WATERS ACADEMY").setFont(bold).setFontSize(13).setTextAlignment(TextAlignment.CENTER))
            .add(new Paragraph("PO BOX 65039 - 00618 Ruaraka").setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
            .add(new Paragraph("Contact: 0722479793/0113581219/0737107950").setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
            .add(new Paragraph("Email: calmwaters91@gmail.com").setFont(regular).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
            .add(new Paragraph("MOTTO: SERVING GOD & HUMANITY THROUGH EDUCATION").setFont(italic).setFontSize(7).setTextAlignment(TextAlignment.CENTER))
            .setBorder(Border.NO_BORDER));
        doc.add(ht);
    }

    private void buildNameGradeRow(Document doc, PdfFont bold, String name, String grade) {
        Table t = new Table(UnitValue.createPercentArray(new float[]{70,30})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(8);
        t.addCell(new Cell().add(new Paragraph("LEARNER'S NAME:  "+name.toUpperCase()).setFont(bold).setFontSize(10)).setBorder(Border.NO_BORDER));
        t.addCell(new Cell().add(new Paragraph(grade).setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));
        doc.add(t);
    }

    private void buildRubric(Document doc, PdfFont bold, PdfFont regular) {
        doc.add(new Paragraph(" ").setMarginTop(6));
        Table r = new Table(UnitValue.createPercentArray(new float[]{14,11,11,11,11,11,11,11,9})).setWidth(UnitValue.createPercentValue(100));
        for (String l : new String[]{"RUBRIC","EE 1","EE 2","ME 1","ME 2","AE 1","AE 2","BE 1","BE 2"})
            r.addCell(new Cell().add(new Paragraph(l).setFont(bold).setFontSize(9)).setBackgroundColor(TABLE_HEADER_BG).setTextAlignment(TextAlignment.CENTER).setPadding(4));
        for (String m : new String[]{"MARK","90-100","75-89","58-74","41-57","31-40","21-30","11-20","1-10"})
            r.addCell(new Cell().add(new Paragraph(m).setFont(regular).setFontSize(9)).setTextAlignment(TextAlignment.CENTER).setPadding(4));
        doc.add(r);
    }

    private void buildSignatures(Document doc, PdfFont bold, PdfFont regular) {
        Table t = new Table(UnitValue.createPercentArray(new float[]{40,35,25})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(14);
        t.addCell(new Cell().add(new Paragraph("HEAD TEACHER'S SIGNATURE:").setFont(bold).setFontSize(8)).add(new Paragraph(" ").setFontSize(6)).add(new Paragraph("________________________________").setFont(regular).setFontSize(9)).setBorder(Border.NO_BORDER));
        t.addCell(new Cell().add(new Paragraph("CLASS TEACHER'S SIGNATURE:").setFont(bold).setFontSize(8)).add(new Paragraph(" ").setFontSize(6)).add(new Paragraph("______________________").setFont(regular).setFontSize(9)).setBorder(Border.NO_BORDER));
        t.addCell(new Cell().add(new Paragraph("DATE:").setFont(bold).setFontSize(8)).add(new Paragraph(" ").setFontSize(6)).add(new Paragraph("_________________").setFont(regular).setFontSize(9)).setBorder(Border.NO_BORDER));
        doc.add(t);
    }

    private void buildDates(Document doc, PdfFont regular) {
        Table t = new Table(UnitValue.createPercentArray(new float[]{50,50})).setWidth(UnitValue.createPercentValue(100)).setMarginTop(6);
        t.addCell(new Cell().add(new Paragraph("CLOSING DATE:  ________________________").setFont(regular).setFontSize(9)).setBorder(Border.NO_BORDER));
        t.addCell(new Cell().add(new Paragraph("OPENING DATE:  ________________________").setFont(regular).setFontSize(9).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));
        doc.add(t);
    }

    private void addSchoolHeader(Document doc, PdfFont bold, PdfFont regular) throws Exception {
        Table ht = new Table(UnitValue.createPercentArray(new float[]{12,88})).setWidth(UnitValue.createPercentValue(100));
        try (InputStream ls = ReportService.class.getResourceAsStream("/static/school_logo.png")) {
            if (ls!=null) { ht.addCell(new Cell().add(new Image(ImageDataFactory.create(ls.readAllBytes())).setWidth(45).setHeight(45)).setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE)); }
            else ht.addCell(new Cell().setBorder(Border.NO_BORDER));
        } catch (Exception ignored) { ht.addCell(new Cell().setBorder(Border.NO_BORDER)); }
        ht.addCell(new Cell().add(new Paragraph("SANTA ANA CALM WATERS ACADEMY").setFont(bold).setFontSize(14).setTextAlignment(TextAlignment.CENTER).setFontColor(HEADER_COLOR)).setBorder(Border.NO_BORDER));
        doc.add(ht);
    }

    // ── Cell helpers ──
    private void addHeaderCell(Table t, String text, PdfFont f) { addHeaderCell(t,text,f,9f); }
    private void addHeaderCell(Table t, String text, PdfFont f, float fs) {
        t.addHeaderCell(new Cell().add(new Paragraph(text).setFont(f).setFontSize(fs)).setBackgroundColor(HEADER_COLOR).setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.CENTER).setPadding(4));
    }
    private void addCell(Table t, String text, PdfFont f, DeviceRgb bg) { addCell(t,text,f,bg,9f); }
    private void addCell(Table t, String text, PdfFont f, DeviceRgb bg, float fs) {
        Cell c = new Cell().add(new Paragraph(text!=null?text:"-").setFont(f).setFontSize(fs)).setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(3);
        if (bg!=null) c.setBackgroundColor(bg); t.addCell(c);
    }
    private void addMarkCell(Table t, String text, PdfFont f, float fs, DeviceRgb bg, TextAlignment a, float mh) {
        Cell c = new Cell().add(new Paragraph(text!=null?text:"").setFont(f).setFontSize(fs)).setTextAlignment(a).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(4).setMinHeight(mh);
        if (bg!=null) c.setBackgroundColor(bg); t.addCell(c);
    }

    // ── Sizing helpers ──
    private float rowHeight(int n)  { return n<=5?52f:n<=7?42f:n<=9?34f:26f; }
    private float bodyFont(int n)   { return n<=5?12f:n<=7?11f:n<=9?10f:9f; }
    private float headerFont(int n) { return n<=7?10f:9f; }

    // ── Grade helpers ──
    private String getGrade(double score) {
        return markService.calculateCbcGrade(java.math.BigDecimal.valueOf(score));
    }
    private DeviceRgb getGradeColor(String g) { if(g==null)return new DeviceRgb(0,0,0); if(g.startsWith("EE"))return EE_COLOR;if(g.startsWith("ME"))return ME_COLOR;if(g.startsWith("AE"))return AE_COLOR;if(g.startsWith("BE"))return BE_COLOR;return new DeviceRgb(0,0,0); }
    private String getLevelLabel(int gl) { if(gl==-1)return"PRE-PRIMARY ONE (PP1)";if(gl==0)return"PRE-PRIMARY TWO (PP2)";return""; }

    private String generateFacilitatorComment(String fn, String dg, int gl) {
        String n = fn!=null?fn:"The learner";
        return switch(dg) {
            case "EE1"->n+" has demonstrated exceptional mastery this term. Outstanding performance \u2014 keep reaching higher!";
            case "EE2"->n+" has excelled this term and shows strong understanding. Maintain this excellent effort.";
            case "ME1"->n+" has met expectations with commendable performance. A little more effort will take you to excellence.";
            case "ME2"->n+" has met expectations this term. Encourage continued practice to improve further.";
            case "AE1"->n+" is approaching expectations. With more dedication and revision, improvement is very achievable.";
            case "AE2"->n+" is working towards expectations. Additional support and practice at home is recommended.";
            case "BE1"->n+" requires significant support this term. Please engage closely with the class teacher for an improvement plan.";
            case "BE2"->n+" needs urgent academic intervention. Regular revision and parental support are strongly advised.";
            default->n+" has completed the term. Continued effort and dedication will lead to improvement.";
        };
    }
}