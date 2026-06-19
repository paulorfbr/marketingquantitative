package com.marketingquantitative.controller;

import com.marketingquantitative.service.SensitivityService;
import com.marketingquantitative.service.SensitivitySessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SensitivityController.class)
class SensitivityControllerTest {

    @Autowired MockMvc mvc;
    @MockBean SensitivityService sensitivityService;
    @MockBean SensitivitySessionService sensitivitySessionService;

    @Test
    void calculate_missingModel_returns400() throws Exception {
        String body = """
            {"baseInputs":{"demand":1000},"swingPercent":20.0}
            """;
        mvc.perform(post("/api/sensitivity/calculate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void calculate_negativeSwing_returns400() throws Exception {
        String body = """
            {"model":"EOQ","baseInputs":{"demand":1000,"orderingCost":50,"unitCost":10,"holdingRate":0.2},"swingPercent":-5.0}
            """;
        mvc.perform(post("/api/sensitivity/calculate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }
}
