package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.BreakevenSession;
import com.marketingquantitative.repository.BreakevenSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BreakevenSessionServiceTest {

    @Mock
    private BreakevenService breakevenService;

    @Mock
    private BreakevenSessionRepository repository;

    @InjectMocks
    private BreakevenSessionService service;

    // TC-07-B01: save delegates calculation and persists
    @Test
    void saveSession_calculatesAndPersists() {
        var request = new BreakevenSaveRequest("Q1", 5000.0, 30.0, 50.0);
        when(breakevenService.calculate(any())).thenReturn(new BreakevenResponse(250.0, 12500.0, 20.0, 0.4));

        BreakevenSession saved = new BreakevenSession("Q1", 5000.0, 30.0, 50.0, 250.0, 12500.0, 20.0, 0.4);
        when(repository.save(any())).thenReturn(saved);

        BreakevenSessionResponse response = service.saveSession(request);

        assertThat(response.breakEvenQty()).isEqualTo(250.0);
        assertThat(response.contributionMargin()).isEqualTo(20.0);
        verify(repository).save(any());
    }

    // TC-07-B02: list returns summaries in order
    @Test
    void listSessions_returnsSummaries() {
        var s1 = new BreakevenSession("A", 5000, 30, 50, 250, 12500, 20, 0.4);
        var s2 = new BreakevenSession("B", 1000, 10, 25, 66.67, 1666.67, 15, 0.6);
        when(repository.findTop20ByOrderByCreatedAtDesc()).thenReturn(List.of(s1, s2));

        List<BreakevenSessionSummary> list = service.listSessions();

        assertThat(list).hasSize(2);
        assertThat(list.get(0).name()).isEqualTo("A");
        assertThat(list.get(0).breakEvenQty()).isEqualTo(250.0);
    }

    // TC-07-B03: get by id returns full detail
    @Test
    void getSession_existingId_returnsDetail() {
        var session = new BreakevenSession("Q1", 5000, 30, 50, 250, 12500, 20, 0.4);
        when(repository.findById(1L)).thenReturn(Optional.of(session));

        BreakevenSessionResponse response = service.getSession(1L);

        assertThat(response.fixedCosts()).isEqualTo(5000.0);
        assertThat(response.pricePerUnit()).isEqualTo(50.0);
    }

    // TC-07-B04: get unknown id throws 404
    @Test
    void getSession_unknownId_throws404() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSession(999L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("999");
    }
}
