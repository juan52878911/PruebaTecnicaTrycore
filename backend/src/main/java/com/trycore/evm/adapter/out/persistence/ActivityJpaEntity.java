package com.trycore.evm.adapter.out.persistence;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import com.trycore.evm.domain.model.Activity;

/**
 * Entidad JPA de una actividad. Solo mapea columnas de la tabla {@code activities}; las
 * invariantes de negocio viven en {@link Activity} y en {@code ActivityFigures}, nunca aquí.
 */
@Entity
@Table(name = "activities")
public class ActivityJpaEntity {

    private static final int MEASUREMENT_METHOD_LENGTH = 24;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "name", nullable = false, length = Activity.NAME_MAX_LENGTH)
    private String name;

    @Column(name = "budget_at_completion", nullable = false)
    private BigDecimal budgetAtCompletion;

    @Column(name = "planned_progress_percent", nullable = false)
    private BigDecimal plannedProgressPercent;

    @Column(name = "actual_progress_percent", nullable = false)
    private BigDecimal actualProgressPercent;

    @Column(name = "actual_cost", nullable = false)
    private BigDecimal actualCost;

    @Column(name = "measurement_method", nullable = false, length = MEASUREMENT_METHOD_LENGTH)
    private String measurementMethod;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    /**
     * Hitos de la actividad, ordenados por su posición. La cascada y la eliminación de huérfanos
     * hacen que el conjunto se escriba y se borre siempre entero con su actividad, que es
     * exactamente la semántica que exige la invariante de los pesos.
     */
    @OneToMany(
            mappedBy = "activity",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    private List<ActivityMilestoneJpaEntity> milestones = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ActivityJpaEntity() {
        // Constructor requerido por JPA.
    }

    @PrePersist
    void onCreate() {
        final Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
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

    public String getName() {
        return name;
    }

    public void setName(final String name) {
        this.name = name;
    }

    public BigDecimal getBudgetAtCompletion() {
        return budgetAtCompletion;
    }

    public void setBudgetAtCompletion(final BigDecimal budgetAtCompletion) {
        this.budgetAtCompletion = budgetAtCompletion;
    }

    public BigDecimal getPlannedProgressPercent() {
        return plannedProgressPercent;
    }

    public void setPlannedProgressPercent(final BigDecimal plannedProgressPercent) {
        this.plannedProgressPercent = plannedProgressPercent;
    }

    public BigDecimal getActualProgressPercent() {
        return actualProgressPercent;
    }

    public void setActualProgressPercent(final BigDecimal actualProgressPercent) {
        this.actualProgressPercent = actualProgressPercent;
    }

    public BigDecimal getActualCost() {
        return actualCost;
    }

    public void setActualCost(final BigDecimal actualCost) {
        this.actualCost = actualCost;
    }

    public String getMeasurementMethod() {
        return measurementMethod;
    }

    public void setMeasurementMethod(final String measurementMethod) {
        this.measurementMethod = measurementMethod;
    }

    public LocalDate getPlannedStartDate() {
        return plannedStartDate;
    }

    public void setPlannedStartDate(final LocalDate plannedStartDate) {
        this.plannedStartDate = plannedStartDate;
    }

    public LocalDate getPlannedEndDate() {
        return plannedEndDate;
    }

    public void setPlannedEndDate(final LocalDate plannedEndDate) {
        this.plannedEndDate = plannedEndDate;
    }

    public LocalDate getActualStartDate() {
        return actualStartDate;
    }

    public void setActualStartDate(final LocalDate actualStartDate) {
        this.actualStartDate = actualStartDate;
    }

    public LocalDate getActualEndDate() {
        return actualEndDate;
    }

    public void setActualEndDate(final LocalDate actualEndDate) {
        this.actualEndDate = actualEndDate;
    }

    /** Lista viva de hitos: quien la modifique cambia lo que se persiste al cerrar la transacción. */
    public List<ActivityMilestoneJpaEntity> getMilestones() {
        return milestones;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
