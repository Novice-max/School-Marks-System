package com.school.marks.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── Request problems: the CALLER got something wrong, so 4xx — never 500 ──
    // (Before these, unknown URLs and bad input fell through to the catch-all
    //  below and showed up as 500 "server errors" in the network logs.)

    /** Unknown URL — bots probing paths, old bookmarks. */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Not found"));
    }

    /** e.g. GET on an endpoint that only accepts POST. */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethod(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(Map.of("message", "Method not allowed"));
    }

    /** Body isn't valid JSON, or a field has the wrong type. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "The request could not be read. Check the values entered."));
    }

    /** @Valid failed (e.g. a required field was blank). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleInvalid(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Some values are missing or invalid.");
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }

    /** e.g. /api/teacher/marks/abc/12 — "abc" isn't a number. */
    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<Map<String, String>> handleBadParam(Exception ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid or missing request parameter."));
    }

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
     * Logged-in user tried something their role / assignments don't allow.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "You do not have permission to do that.";
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
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