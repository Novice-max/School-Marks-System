package com.school.marks.controller;

import com.school.marks.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    // Download full class marklist as PDF
    @GetMapping("/marklist/{examId}")
    public ResponseEntity<byte[]> downloadMarklist(@PathVariable Long examId) throws Exception {
        byte[] pdf = reportService.generateClassMarklistPdf(examId);

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
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
            ContentDisposition.attachment()
                .filename("school_report_" + academicYear + "_term" + term + ".pdf")
                .build());
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}