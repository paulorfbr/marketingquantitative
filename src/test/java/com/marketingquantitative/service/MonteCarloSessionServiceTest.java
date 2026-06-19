package com.marketingquantitative.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.MonteCarloSession;
import com.marketingquantitative.repository.MonteCarloSessionRepository;
import com.marketingquantitative.shared.DistributionType;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonteCarloSessionServiceTest {

    @Mock MonteCarloService monteCarloService;
    @Mock MonteCarloSessionRepository repository;
    @Spy  ObjectMapper objectMapper;
    @InjectMocks MonteCarloSessionService service;

    // TC-08-MC-S01: save calculates and persists
    @Test
    void saveSession_calculatesAndPersists() {
        when(monteCarloService.simulate(any())).thenReturn(
            new MonteCarloResponse(new double[]{100.0, 200.0}, 150.0, 50.0, 110.0, 130.0, 150.0, 170.0, 190.0)
        );
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dist = new InputDistribution(DistributionType.UNIFORM, null, null, 800.0, 1200.0, null);
        var req = new MonteCarloSaveRequest("Test", ModelType.EOQ,
            Map.of("demand", dist, "orderingCost", dist, "unitCost", dist, "holdingRate", dist), 1000);
        MonteCarloSessionResponse resp = service.saveSession(req);

        assertThat(resp.name()).isEqualTo("Test");
        assertThat(resp.results().mean()).isEqualTo(150.0);
        verify(repository).save(any());
    }

    // TC-08-MC-S02: listSessions returns summaries
    @Test
    void listSessions_returnsSummaries() throws Exception {
        var om = new ObjectMapper();
        var s = new MonteCarloSession("A", "EOQ",
            om.writeValueAsString(Map.of()),
            500,
            om.writeValueAsString(new MonteCarloResponse(new double[0], 0, 0, 0, 0, 0, 0, 0)));
        when(repository.findTop20ByOrderByCreatedAtDesc()).thenReturn(List.of(s));

        assertThat(service.listSessions()).hasSize(1);
    }

    // TC-08-MC-S03: getSession unknown id throws 404
    @Test
    void getSession_unknownId_throws404() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getSession(99L))
            .isInstanceOf(ResponseStatusException.class);
    }
}
