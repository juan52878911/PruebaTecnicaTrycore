package com.trycore.evm.adapter.out.persistence;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import com.trycore.evm.domain.model.ProjectMeasurement;

/**
 * Entidad JPA de un corte del histórico. Solo mapea columnas de la tabla
 * {@code project_measurements}; las invariantes de negocio viven en {@link ProjectMeasurement},
 * nunca aquí.
 *
 * <p>Las líneas por actividad son parte del mismo agregado: se guardan y se borran con el corte,
 * de ahí la cascada y el {@code orphanRemoval}. No hay {@code @PreUpdate} porque una medición no
 * se modifica: para rectificarla se borra y se toma otra.
 */
@Entity
@Table(name = "project_measurements")
public class ProjectMeasurementJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "cutoff_date", nullable = false)
    private LocalDate cutoffDate;

    @Column(name = "notes", length = ProjectMeasurement.NOTES_MAX_LENGTH)
    private String notes;

    @Column(name = "budget_at_completion", nullable = false)
    private BigDecimal budgetAtCompletion;

    @Column(name = "planned_value", nullable = false)
    private BigDecimal plannedValue;

    @Column(name = "earned_value", nullable = false)
    private BigDecimal earnedValue;

    @Column(name = "actual_cost", nullable = false)
    private BigDecimal actualCost;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(
            mappedBy = "measurement",
            cascade = CascadeType.ALL,
            orphanRemoval = true)
    private List<ProjectMeasurementActivityJpaEntity> activities = new ArrayList<>();

    protected ProjectMeasurementJpaEntity() {
        // Constructor requerido por JPA.
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    /** Añade una línea al corte manteniendo los dos extremos de la relación coherentes. */
    void addActivity(final ProjectMeasurementActivityJpaEntity activity) {
        activity.setMeasurement(this);
        this.activities.add(activity);
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(final Long projectId) {
        this.projectId = projectId;
    }

    public LocalDate getCutoffDate() {
        return cutoffDate;
    }

    public void setCutoffDate(final LocalDate cutoffDate) {
        this.cutoffDate = cutoffDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(final String notes) {
        this.notes = notes;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public List<ProjectMeasurementActivityJpaEntity> getActivities() {
        return activities;
    }
}
