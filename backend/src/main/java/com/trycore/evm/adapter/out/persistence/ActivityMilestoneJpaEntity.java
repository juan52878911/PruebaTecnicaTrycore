package com.trycore.evm.adapter.out.persistence;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.trycore.evm.domain.model.Milestone;

/**
 * Entidad JPA de un hito de actividad. Solo mapea columnas de la tabla
 * {@code activity_milestones}; las invariantes de negocio viven en {@link Milestone} y en
 * {@code ProgressMeasurement}, nunca aquí.
 */
@Entity
@Table(name = "activity_milestones")
public class ActivityMilestoneJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private ActivityJpaEntity activity;

    @Column(name = "name", nullable = false, length = Milestone.NAME_MAX_LENGTH)
    private String name;

    @Column(name = "weight_percent", nullable = false)
    private BigDecimal weightPercent;

    @Column(name = "achieved", nullable = false)
    private boolean achieved;

    @Column(name = "achieved_on")
    private LocalDate achievedOn;

    @Column(name = "position", nullable = false)
    private int position;

    protected ActivityMilestoneJpaEntity() {
        // Constructor requerido por JPA.
    }

    ActivityMilestoneJpaEntity(final ActivityJpaEntity activity) {
        this.activity = activity;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(final String name) {
        this.name = name;
    }

    public BigDecimal getWeightPercent() {
        return weightPercent;
    }

    public void setWeightPercent(final BigDecimal weightPercent) {
        this.weightPercent = weightPercent;
    }

    public boolean isAchieved() {
        return achieved;
    }

    public void setAchieved(final boolean achieved) {
        this.achieved = achieved;
    }

    public LocalDate getAchievedOn() {
        return achievedOn;
    }

    public void setAchievedOn(final LocalDate achievedOn) {
        this.achievedOn = achievedOn;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(final int position) {
        this.position = position;
    }
}
