package com.school.marks.controller;

import com.school.marks.repository.ClassRoomRepository;
import com.school.marks.repository.ExamRepository;
import com.school.marks.repository.StudentRepository;
import com.school.marks.service.AuditService;
import com.school.marks.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/**
 * PDF downloads. Locked to ADMIN / SUPERADMIN in SecurityConfig.
 * Every download (and preview — the frontend uses the same endpoints) is audited.
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final AuditService audit;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ExamRepository examRepository;

    // Download full class marklist as PDF
    @GetMapping("/marklist/{examId}")
    public ResponseEntity<byte[]> downloadMarklist(@PathVariable Long examId) throws Exception {
        byte[] pdf = reportService.generateClassMarklistPdf(examId);

        audit.record(AuditService.REPORTS, "DOWNLOAD", "exams", examId, "Class marklist · " + examLabel(examId));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
            ContentDisposition.attachment().filename("marklist_exam_" + examId + ".pdf").build());

        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    // Download individual student marksheet as PDF
    @GetMapping("/marksheet/{studentId}/{examId}")
    public ResponseEntity<byte[]> downloadMarksheet(
            @PathVariable Long studentId,
            @PathVariable Long examId) throws Exception {

        byte[] pdf = reportService.generateStudentMarksheetPdf(studentId, examId);

        audit.record(AuditService.REPORTS, "DOWNLOAD", "students", studentId,
                "Marksheet · " + studentLabel(studentId) + " · " + examLabel(examId));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
            ContentDisposition.attachment()
                    .filename("marksheet_student_" + studentId + "_exam_" + examId + ".pdf")
                    .build());

        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    // Download single student term report card
    @GetMapping("/termreport/{studentId}/{classId}/{term}/{academicYear}")
    public ResponseEntity<byte[]> downloadTermReport(
            @PathVariable Long studentId,
            @PathVariable Long classId,
            @PathVariable Integer term,
            @PathVariable String academicYear) throws Exception {

        byte[] pdf = reportService.generateTermReportPdf(studentId, classId, term, academicYear);

        audit.record(AuditService.REPORTS, "DOWNLOAD", "students", studentId,
                "Report card · " + studentLabel(studentId) + " · " + classLabel(classId) + " · T" + term + " " + academicYear);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
            ContentDisposition.attachment()
                    .filename("report_student_" + studentId + "_term" + term + ".pdf")
                    .build());

        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    // Download ALL report cards for a class — one PDF, one student per page
    @GetMapping("/termreport/class/{classId}/{term}/{academicYear}")
    public ResponseEntity<byte[]> downloadAllTermReports(
            @PathVariable Long classId,
            @PathVariable Integer term,
            @PathVariable String academicYear) throws Exception {

        byte[] pdf = reportService.generateAllTermReportsPdf(classId, term, academicYear);

        audit.record(AuditService.REPORTS, "DOWNLOAD", "classes", classId,
                "All report cards · " + classLabel(classId) + " · T" + term + " " + academicYear);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
            ContentDisposition.attachment()
                    .filename("all_reports_class_" + classId + "_term" + term + "_" + academicYear + ".pdf")
                    .build());

        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    // School-wide report
    @GetMapping("/school/{academicYear}/{term}/{examName}")
    public ResponseEntity<byte[]> downloadSchoolReport(
            @PathVariable String academicYear,
            @PathVariable Integer term,
            @PathVariable String examName) throws Exception {
        byte[] pdf = reportService.generateSchoolReportPdf(academicYear, term, examName);

        audit.record(AuditService.REPORTS, "DOWNLOAD", "exams", null,
                "School report · " + examName + " T" + term + " " + academicYear);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
            ContentDisposition.attachment()
                .filename("school_report_" + academicYear + "_term" + term + ".pdf")
                .build());
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    // ── labels for the audit log ──

    private String studentLabel(Long studentId) {
        return studentRepository.findById(studentId)
                .map(s -> s.getFullName() + " (" + s.getAdmissionNumber() + ")")
                .orElse("student #" + studentId);
    }

    private String classLabel(Long classId) {
        return classRoomRepository.findById(classId)
                .map(c -> c.getDisplayName())
                .orElse("class #" + classId);
    }

    private String examLabel(Long examId) {
        return examRepository.findById(examId)
                .map(e -> e.getExamName() + " T" + e.getTerm() + " " + e.getAcademicYear()
                        + " · " + e.getClassRoom().getDisplayName())
                .orElse("exam #" + examId);
    }
}
