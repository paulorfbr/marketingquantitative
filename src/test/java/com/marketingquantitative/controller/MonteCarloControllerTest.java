package com.marketingquantitative.controller;

import com.marketingquantitative.service.MonteCarloService;
import com.marketingquantitative.service.MonteCarloSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MonteCarloController.class)
class MonteCarloControllerTest {

    @Autowired MockMvc mvc;
    @MockBean MonteCarloService monteCarloService;
    @MockBean MonteCarloSessionService monteCarloSessionService;

    @Test
    void simulate_missingModel_returns400() throws Exception {
        mvc.perform(post("/api/montecarlo/simulate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"inputs":{},"iterations":100}
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void simulate_iterationsExceedsMax_returns400() throws Exception {
        mvc.perform(post("/api/montecarlo/simulate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"model":"EOQ","inputs":{},"iterations":200000}
                    """))
            .andExpect(status().isBadRequest());
    }
}
