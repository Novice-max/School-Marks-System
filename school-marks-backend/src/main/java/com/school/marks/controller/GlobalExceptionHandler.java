package com.school.marks.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Database constraint violations (duplicate keys, foreign key issues).
     * This is the bug that masked the student-add 403.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = "A database constraint was violated.";

        if (detail != null) {
            if (detail.contains("admission_number")) {
                message = "Admission number already exists.";
            } else if (detail.contains("username")) {
                message = "Username already exists.";
            } else if (detail.contains("foreign key") || detail.contains("fk_")) {
                message = "Cannot delete — this record is referenced by other data.";
            }
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", message));
    }

    /**
     * Entity not found (e.g. student, teacher, class doesn't exist).
     */
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchElementException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Requested record not found.";
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", message));
    }

    /**
     * RuntimeException with a message (used throughout the codebase for business logic errors).
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        // Don't catch AccessDeniedException here — let Spring Security handle it
        if (ex instanceof AccessDeniedException) {
            throw ex;
        }
        String message = ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred.";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", message));
    }

    /**
     * Catch-all for anything else that slips through.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
        if (ex instanceof AccessDeniedException) {
            throw (AccessDeniedException) ex;
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Something went wrong. Please try again or contact admin."));
    }
}