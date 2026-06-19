package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class MonteCarloSessionService {
    public MonteCarloSessionResponse saveSession(MonteCarloSaveRequest r) { throw new UnsupportedOperationException(); }
    public List<MonteCarloSessionSummary> listSessions() { return List.of(); }
    public MonteCarloSessionResponse getSession(Long id) { throw new UnsupportedOperationException(); }
}
