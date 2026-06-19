package com.marketingquantitative.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "montecarlo_session")
public class MonteCarloSession {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)                            private String name;
    @Column(nullable = false)                            private String model;
    @Column(name = "inputs", nullable = false, columnDefinition = "text") private String inputsJson;
    @Column(nullable = false)                            private Integer iterations;
    @Column(name = "results", nullable = false, columnDefinition = "text") private String resultsJson;
    @Column(nullable = false, updatable = false)         private Instant createdAt;

    protected MonteCarloSession() {}

    public MonteCarloSession(String name, String model, String inputsJson,
                              int iterations, String resultsJson) {
        this.name = name; this.model = model;
        this.inputsJson = inputsJson;
        this.iterations = iterations;
        this.resultsJson = resultsJson;
    }

    @PrePersist void onPersist() { createdAt = Instant.now(); }

    public Long getId()           { return id; }
    public String getName()       { return name; }
    public String getModel()      { return model; }
    public String getInputsJson() { return inputsJson; }
    public Integer getIterations(){ return iterations; }
    public String getResultsJson(){ return resultsJson; }
    public Instant getCreatedAt() { return createdAt; }
}
