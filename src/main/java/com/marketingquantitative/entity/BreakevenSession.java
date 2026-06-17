package com.marketingquantitative.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "breakeven_session")
public class BreakevenSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double fixedCosts;

    @Column(nullable = false)
    private Double variableCostPerUnit;

    @Column(nullable = false)
    private Double pricePerUnit;

    @Column(nullable = false)
    private Double breakEvenQty;

    @Column(nullable = false)
    private Double breakEvenRevenue;

    @Column(nullable = false)
    private Double contributionMargin;

    @Column(nullable = false)
    private Double marginRatio;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected BreakevenSession() {}

    public BreakevenSession(String name, double fixedCosts, double variableCostPerUnit,
                            double pricePerUnit, double breakEvenQty, double breakEvenRevenue,
                            double contributionMargin, double marginRatio) {
        this.name = name;
        this.fixedCosts = fixedCosts;
        this.variableCostPerUnit = variableCostPerUnit;
        this.pricePerUnit = pricePerUnit;
        this.breakEvenQty = breakEvenQty;
        this.breakEvenRevenue = breakEvenRevenue;
        this.contributionMargin = contributionMargin;
        this.marginRatio = marginRatio;
    }

    @PrePersist
    void onPersist() { createdAt = Instant.now(); }

    public Long getId()                  { return id; }
    public String getName()              { return name; }
    public Double getFixedCosts()        { return fixedCosts; }
    public Double getVariableCostPerUnit() { return variableCostPerUnit; }
    public Double getPricePerUnit()      { return pricePerUnit; }
    public Double getBreakEvenQty()      { return breakEvenQty; }
    public Double getBreakEvenRevenue()  { return breakEvenRevenue; }
    public Double getContributionMargin(){ return contributionMargin; }
    public Double getMarginRatio()       { return marginRatio; }
    public Instant getCreatedAt()        { return createdAt; }
}
