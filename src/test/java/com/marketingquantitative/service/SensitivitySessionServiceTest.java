package com.marketingquantitative.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.SensitivitySession;
import com.marketingquantitative.repository.SensitivitySessionRepository;
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
class SensitivitySessionServiceTest {

    @Mock SensitivityService sensitivityService;
    @Mock SensitivitySessionRepository repository;
    @Spy  ObjectMapper objectMapper;
    @InjectMocks SensitivitySessionService service;

    // TC-08-SS01: save calculates and persists
    @Test
    void saveSession_calculatesAndPersists() {
        var params = List.of(new ParameterSensitivity("demand", 800.0, 1200.0, 200.0, 250.0, 50.0));
        when(sensitivityService.calculate(any())).thenReturn(new SensitivityResponse(223.61, params));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = new SensitivitySaveRequest("Test", ModelType.EOQ,
            Map.of("demand", 1000.0, "orderingCost", 50.0, "unitCost", 10.0, "holdingRate", 0.2),
            20.0);
        SensitivitySessionResponse resp = service.saveSession(req);

        assertThat(resp.name()).isEqualTo("Test");
        assertThat(resp.model()).isEqualTo(ModelType.EOQ);
        assertThat(resp.results().baseOutput()).isEqualTo(223.61);
        verify(repository).save(any());
    }

    // TC-08-SS02: listSessions returns summaries
    @Test
    void listSessions_returnsSummaries() throws Exception {
        var s = new SensitivitySession("A", "EOQ",
            new ObjectMapper().writeValueAsString(Map.of("demand", 1000.0)),
            20.0, new ObjectMapper().writeValueAsString(new SensitivityResponse(100.0, List.of())));
        when(repository.findTop20ByOrderByCreatedAtDesc()).thenReturn(List.of(s));

        List<SensitivitySessionSummary> list = service.listSessions();
        assertThat(list).hasSize(1);
        assertThat(list.get(0).name()).isEqualTo("A");
    }

    // TC-08-SS03: getSession unknown id throws 404
    @Test
    void getSession_unknownId_throws404() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getSession(99L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("99");
    }
}
