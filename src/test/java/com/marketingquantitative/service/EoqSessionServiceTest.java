package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.EoqSession;
import com.marketingquantitative.repository.EoqSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EoqSessionServiceTest {

    @Mock
    private EoqService eoqService;

    @Mock
    private EoqSessionRepository repository;

    @InjectMocks
    private EoqSessionService service;

    // TC-07-E01: save delegates calculation to EoqService and persists the entity
    @Test
    void saveSession_calculatesAndPersists() {
        var request = new EoqSaveRequest("Test", 1000.0, 50.0, 10.0, 0.2);
        when(eoqService.calculate(any())).thenReturn(new EoqResponse(223.61, 4.47, 81.62, 447.21));

        EoqSession saved = stubSaved("Test", 1000.0, 50.0, 10.0, 0.2, 223.61, 4.47, 81.62, 447.21);
        when(repository.save(any())).thenReturn(saved);

        EoqSessionResponse response = service.saveSession(request);

        assertThat(response.name()).isEqualTo("Test");
        assertThat(response.eoq()).isEqualTo(223.61);
        assertThat(response.id()).isNull(); // stub entity has no JPA-assigned id
        verify(repository).save(any());
    }

    // TC-07-E02: listSessions returns summaries sorted by createdAt desc
    @Test
    void listSessions_returnsSummaries() {
        var s1 = stubSaved("A", 1000, 50, 10, 0.2, 223.61, 4.47, 81.62, 447.21);
        var s2 = stubSaved("B", 500,  40,  8, 0.1, 316.23, 1.58, 231.0, 252.98);
        when(repository.findTop20ByOrderByCreatedAtDesc()).thenReturn(List.of(s1, s2));

        List<EoqSessionSummary> list = service.listSessions();

        assertThat(list).hasSize(2);
        assertThat(list.get(0).name()).isEqualTo("A");
        assertThat(list.get(1).name()).isEqualTo("B");
    }

    // TC-07-E03: getSession by id returns full detail
    @Test
    void getSession_existingId_returnsDetail() {
        var session = stubSaved("Q1", 1000, 50, 10, 0.2, 223.61, 4.47, 81.62, 447.21);
        when(repository.findById(1L)).thenReturn(Optional.of(session));

        EoqSessionResponse response = service.getSession(1L);

        assertThat(response.demand()).isEqualTo(1000.0);
        assertThat(response.eoq()).isEqualTo(223.61);
    }

    // TC-07-E04: getSession with unknown id throws 404
    @Test
    void getSession_unknownId_throws404() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSession(999L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("999");
    }

    private EoqSession stubSaved(String name, double demand, double orderingCost, double unitCost,
                                  double holdingRate, double eoq, double ordersPerYear,
                                  double cycleDays, double totalAnnualCost) {
        EoqSession s = new EoqSession(name, demand, orderingCost, unitCost, holdingRate,
                                      eoq, ordersPerYear, cycleDays, totalAnnualCost);
        // simulate @PrePersist + identity assignment via reflection-free approach — we accept id=null in stub
        return s;
    }
}
