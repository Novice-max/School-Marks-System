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
}
