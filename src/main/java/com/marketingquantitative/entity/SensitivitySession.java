package com.marketingquantitative.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sensitivity_session")
public class SensitivitySession {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)                            private String name;
    @Column(nullable = false)                            private String model;
    @Column(nullable = false, columnDefinition = "text") private String baseInputsJson;
    @Column(nullable = false)                            private Double swingPercent;
    @Column(nullable = false, columnDefinition = "text") private String resultsJson;
    @Column(nullable = false, updatable = false)         private Instant createdAt;

    protected SensitivitySession() {}

    public SensitivitySession(String name, String model, String baseInputsJson,
                               double swingPercent, String resultsJson) {
        this.name = name; this.model = model;
        this.baseInputsJson = baseInputsJson;
        this.swingPercent = swingPercent;
        this.resultsJson = resultsJson;
    }

    @PrePersist void onPersist() { createdAt = Instant.now(); }

    public Long getId()               { return id; }
    public String getName()           { return name; }
    public String getModel()          { return model; }
    public String getBaseInputsJson() { return baseInputsJson; }
    public Double getSwingPercent()   { return swingPercent; }
    public String getResultsJson()    { return resultsJson; }
    public Instant getCreatedAt()     { return createdAt; }
}
