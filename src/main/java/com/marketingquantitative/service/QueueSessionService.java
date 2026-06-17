package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.QueueSession;
import com.marketingquantitative.repository.QueueSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class QueueSessionService {

    private final QueueService queueService;
    private final QueueSessionRepository repository;

    QueueSessionService(QueueService queueService, QueueSessionRepository repository) {
        this.queueService = queueService;
        this.repository = repository;
    }

    @Transactional
    public QueueSessionResponse saveSession(QueueSaveRequest request) {
        QueueResponse result = queueService.calculate(
            new QueueRequest(request.arrivalRate(), request.serviceRate(), request.servers())
        );
        QueueSession session = new QueueSession(
            request.name(), request.arrivalRate(), request.serviceRate(), request.servers(),
            result.utilization(), result.p0(), result.lq(), result.l(), result.wq(), result.w()
        );
        return toResponse(repository.save(session));
    }

    @Transactional(readOnly = true)
    public List<QueueSessionSummary> listSessions() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
            .map(s -> new QueueSessionSummary(s.getId(), s.getName(), s.getUtilization(), s.getCreatedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public QueueSessionResponse getSession(Long id) {
        return repository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "session not found: " + id));
    }

    private QueueSessionResponse toResponse(QueueSession s) {
        return new QueueSessionResponse(
            s.getId(), s.getName(), s.getArrivalRate(), s.getServiceRate(), s.getServers(),
            s.getUtilization(), s.getP0(), s.getLq(), s.getL(), s.getWq(), s.getW(), s.getCreatedAt()
        );
    }
}
