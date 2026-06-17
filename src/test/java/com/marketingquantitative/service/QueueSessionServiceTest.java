package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.QueueSession;
import com.marketingquantitative.repository.QueueSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QueueSessionServiceTest {

    @Mock
    private QueueService queueService;

    @Mock
    private QueueSessionRepository repository;

    @InjectMocks
    private QueueSessionService service;

    // TC-07-Q01: save delegates to QueueService and persists
    @Test
    void saveSession_calculatesAndPersists() {
        var request = new QueueSaveRequest("M/M/1 test", 2.0, 3.0, 1);
        when(queueService.calculate(any())).thenReturn(
            new QueueResponse(0.6667, 0.3333, 1.3333, 2.0, 0.6667, 1.0)
        );

        QueueSession saved = new QueueSession("M/M/1 test", 2.0, 3.0, 1, 0.6667, 0.3333, 1.3333, 2.0, 0.6667, 1.0);
        when(repository.save(any())).thenReturn(saved);

        QueueSessionResponse response = service.saveSession(request);

        assertThat(response.arrivalRate()).isEqualTo(2.0);
        assertThat(response.servers()).isEqualTo(1);
        assertThat(response.utilization()).isCloseTo(0.6667, within(1e-4));
        verify(repository).save(any());
    }

    // TC-07-Q02: list returns summaries with utilization
    @Test
    void listSessions_returnsSummaries() {
        var s1 = new QueueSession("A", 2, 3, 1, 0.6667, 0.3333, 1.3333, 2.0, 0.6667, 1.0);
        var s2 = new QueueSession("B", 4, 3, 2, 0.6667, 0.3333, 1.3333, 4.0, 0.3333, 1.0);
        when(repository.findTop20ByOrderByCreatedAtDesc()).thenReturn(List.of(s1, s2));

        List<QueueSessionSummary> list = service.listSessions();

        assertThat(list).hasSize(2);
        assertThat(list.get(0).name()).isEqualTo("A");
        assertThat(list.get(0).utilization()).isCloseTo(0.6667, within(1e-4));
    }

    // TC-07-Q03: get by id returns full detail
    @Test
    void getSession_existingId_returnsDetail() {
        var session = new QueueSession("A", 2, 3, 1, 0.6667, 0.3333, 1.3333, 2.0, 0.6667, 1.0);
        when(repository.findById(1L)).thenReturn(Optional.of(session));

        QueueSessionResponse response = service.getSession(1L);

        assertThat(response.serviceRate()).isEqualTo(3.0);
        assertThat(response.l()).isEqualTo(2.0);
    }

    // TC-07-Q04: get unknown id throws 404
    @Test
    void getSession_unknownId_throws404() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSession(999L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("999");
    }
}
