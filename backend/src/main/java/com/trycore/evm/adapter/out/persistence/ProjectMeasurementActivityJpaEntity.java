package com.trycore.evm.adapter.out.persistence;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityMeasurement;

/**
 * Entidad JPA de una línea del corte: las cifras de una actividad en la fecha de la medición. Solo
 * mapea columnas de la tabla {@code project_measurement_activities}; el modelo es
 * {@link ActivityMeasurement}.
 *
 * <p>{@code activityId} es un valor suelto, sin relación con {@code ActivityJpaEntity}: la
 * actividad puede borrarse después del corte y la línea debe seguir existiendo. Por eso se guarda
 * también el nombre que tenía entonces.
 */
@Entity
@Table(name = "project_measurement_activities")
public class ProjectMeasurementActivityJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "measurement_id", nullable = false)
    private ProjectMeasurementJpaEntity measurement;

    @Column(name = "activity_id")
    private Long activityId;

    @Column(name = "activity_name", nullable = false, length = Activity.NAME_MAX_LENGTH)
    private String activityName;

    @Column(name = "budget_at_completion", nullable = false)
    private BigDecimal budgetAtCompletion;

    @Column(name = "planned_value", nullable = false)
    private BigDecimal plannedValue;

    @Column(name = "earned_value", nullable = false)
    private BigDecimal earnedValue;

    @Column(name = "actual_cost", nullable = false)
    private BigDecimal actualCost;

    protected ProjectMeasurementActivityJpaEntity() {
        // Constructor requerido por JPA.
    }

    public Long getId() {
        return id;
    }

    public ProjectMeasurementJpaEntity getMeasurement() {
        return measurement;
    }

    public void setMeasurement(final ProjectMeasurementJpaEntity measurement) {
        this.measurement = measurement;
    }

    public Long getActivityId() {
        return activityId;
    }

    public void setActivityId(final Long activityId) {
        this.activityId = activityId;
    }

    public String getActivityName() {
        return activityName;
    }

    public void setActivityName(final String activityName) {
        this.activityName = activityName;
    }

    public BigDecimal getBudgetAtCompletion() {
        return budgetAtCompletion;
    }

    public void setBudgetAtCompletion(final BigDecimal budgetAtCompletion) {
        this.budgetAtCompletion = budgetAtCompletion;
    }

    public BigDecimal getPlannedValue() {
        return plannedValue;
    }

    public void setPlannedValue(final BigDecimal plannedValue) {
        this.plannedValue = plannedValue;
    }

    public BigDecimal getEarnedValue() {
        return earnedValue;
    }

    public void setEarnedValue(final BigDecimal earnedValue) {
        this.earnedValue = earnedValue;
    }

    public BigDecimal getActualCost() {
        return actualCost;
    }

    public void setActualCost(final BigDecimal actualCost) {
        this.actualCost = actualCost;
    }
}
