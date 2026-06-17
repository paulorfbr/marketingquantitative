package com.marketingquantitative.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "queue_session")
public class QueueSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double arrivalRate;

    @Column(nullable = false)
    private Double serviceRate;

    @Column(nullable = false)
    private Integer servers;

    @Column(nullable = false)
    private Double utilization;

    @Column(nullable = false)
    private Double p0;

    @Column(nullable = false)
    private Double lq;

    @Column(nullable = false)
    private Double l;

    @Column(nullable = false)
    private Double wq;

    @Column(nullable = false)
    private Double w;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected QueueSession() {}

    public QueueSession(String name, double arrivalRate, double serviceRate, int servers,
                        double utilization, double p0, double lq, double l, double wq, double w) {
        this.name = name;
        this.arrivalRate = arrivalRate;
        this.serviceRate = serviceRate;
        this.servers = servers;
        this.utilization = utilization;
        this.p0 = p0;
        this.lq = lq;
        this.l = l;
        this.wq = wq;
        this.w = w;
    }

    @PrePersist
    void onPersist() { createdAt = Instant.now(); }

    public Long getId()          { return id; }
    public String getName()      { return name; }
    public Double getArrivalRate() { return arrivalRate; }
    public Double getServiceRate() { return serviceRate; }
    public Integer getServers()  { return servers; }
    public Double getUtilization() { return utilization; }
    public Double getP0()        { return p0; }
    public Double getLq()        { return lq; }
    public Double getL()         { return l; }
    public Double getWq()        { return wq; }
    public Double getW()         { return w; }
    public Instant getCreatedAt(){ return createdAt; }
}
