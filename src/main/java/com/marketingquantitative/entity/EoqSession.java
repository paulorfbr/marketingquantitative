package com.marketingquantitative.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "eoq_session")
public class EoqSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double demand;

    @Column(nullable = false)
    private Double orderingCost;

    @Column(nullable = false)
    private Double unitCost;

    @Column(nullable = false)
    private Double holdingRate;

    @Column(nullable = false)
    private Double eoq;

    @Column(nullable = false)
    private Double ordersPerYear;

    @Column(nullable = false)
    private Double cycleDays;

    @Column(nullable = false)
    private Double totalAnnualCost;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected EoqSession() {}

    public EoqSession(String name, double demand, double orderingCost, double unitCost,
                      double holdingRate, double eoq, double ordersPerYear,
                      double cycleDays, double totalAnnualCost) {
        this.name = name;
        this.demand = demand;
        this.orderingCost = orderingCost;
        this.unitCost = unitCost;
        this.holdingRate = holdingRate;
        this.eoq = eoq;
        this.ordersPerYear = ordersPerYear;
        this.cycleDays = cycleDays;
        this.totalAnnualCost = totalAnnualCost;
    }

    @PrePersist
    void onPersist() { createdAt = Instant.now(); }

    public Long getId()             { return id; }
    public String getName()         { return name; }
    public Double getDemand()       { return demand; }
    public Double getOrderingCost() { return orderingCost; }
    public Double getUnitCost()     { return unitCost; }
    public Double getHoldingRate()  { return holdingRate; }
    public Double getEoq()          { return eoq; }
    public Double getOrdersPerYear(){ return ordersPerYear; }
    public Double getCycleDays()    { return cycleDays; }
    public Double getTotalAnnualCost() { return totalAnnualCost; }
    public Instant getCreatedAt()   { return createdAt; }
}
