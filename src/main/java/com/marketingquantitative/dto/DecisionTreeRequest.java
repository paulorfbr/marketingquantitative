package com.marketingquantitative.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record DecisionTreeRequest(@NotNull NodeDto root) {

    public enum NodeKind { decision, chance }

    public record NodeDto(
        @NotBlank String id,
        @NotNull NodeKind kind,
        @NotBlank String label,
        @NotEmpty List<BranchDto> branches
    ) {}

    public record BranchDto(
        @NotBlank String id,
        @NotBlank String label,
        Double probability,     // required for chance node branches
        Double terminalValue,   // null when branch has a child node
        NodeDto child           // null when branch is a terminal
    ) {}
}
