package com.marketingquantitative.service;

import com.marketingquantitative.dto.DecisionTreeRequest;
import com.marketingquantitative.dto.DecisionTreeRequest.BranchDto;
import com.marketingquantitative.dto.DecisionTreeRequest.NodeDto;
import com.marketingquantitative.dto.DecisionTreeRequest.NodeKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class DecisionTreeServiceTest {

    @InjectMocks
    private DecisionTreeService service;

    // TC-05-U01: single chance node — EMV = 0.6×100 + 0.4×50 = 80
    @Test
    void chanceNode_emvIsWeightedAverage() {
        var root = chanceNode("root", List.of(
            terminal("bA", "A", 0.6, 100.0),
            terminal("bB", "B", 0.4,  50.0)
        ));

        var result = service.calculate(new DecisionTreeRequest(root));

        assertThat(result.rootEmv()).isCloseTo(80.0, within(1e-9));
    }

    // TC-05-U02: decision between chance EMV=80 and terminal 60 → picks 80
    @Test
    void decisionNode_picksMaxEmvBranch() {
        var chanceChild = chanceNode("c1", List.of(
            terminal("bA", "Success", 0.6, 100.0),
            terminal("bB", "Failure", 0.4,  50.0)
        ));
        var root = decisionNode("root", List.of(
            withChild("b1", "Option A", chanceChild),
            terminal("b2", "Option B", null, 60.0)
        ));

        var result = service.calculate(new DecisionTreeRequest(root));

        assertThat(result.rootEmv()).isCloseTo(80.0, within(1e-9));
        assertThat(result.optimalBranchIds()).contains("b1");
        assertThat(result.optimalBranchIds()).doesNotContain("b2");
    }

    // TC-05-U03: two-level nested chance nodes, backwards induction
    @Test
    void twoLevel_backwardsInductionCorrect() {
        // Path A: 0.7×200 + 0.3×50 = 155
        var chanceA = chanceNode("cA", List.of(
            terminal("cA1", "Good", 0.7, 200.0),
            terminal("cA2", "Bad",  0.3,  50.0)
        ));
        // Path B: 0.5×150 + 0.5×80 = 115
        var chanceB = chanceNode("cB", List.of(
            terminal("cB1", "Hit",  0.5, 150.0),
            terminal("cB2", "Miss", 0.5,  80.0)
        ));
        var root = decisionNode("root", List.of(
            withChild("b1", "Path A", chanceA),
            withChild("b2", "Path B", chanceB)
        ));

        var result = service.calculate(new DecisionTreeRequest(root));

        assertThat(result.rootEmv()).isCloseTo(155.0, within(1e-9));
        assertThat(result.nodeEmv().get("cA")).isCloseTo(155.0, within(1e-9));
        assertThat(result.nodeEmv().get("cB")).isCloseTo(115.0, within(1e-9));
        assertThat(result.optimalBranchIds()).contains("b1");
        assertThat(result.optimalBranchIds()).doesNotContain("b2");
    }

    // TC-05-V01: probabilities sum ≠ 1.0 → 400
    @Test
    void chanceProbabilitiesDontSum_throws400() {
        var root = chanceNode("root", List.of(
            terminal("bA", "A", 0.6, 100.0),
            terminal("bB", "B", 0.6,  50.0)  // sum = 1.2
        ));

        assertThatThrownBy(() -> service.calculate(new DecisionTreeRequest(root)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("probabilities must sum to 1.0");
    }

    // TC-05-V02: probability out of range → 400
    @Test
    void negativeProbability_throws400() {
        var root = chanceNode("root", List.of(
            terminal("bA", "A", -0.1, 100.0),
            terminal("bB", "B",  1.1,  50.0)
        ));

        assertThatThrownBy(() -> service.calculate(new DecisionTreeRequest(root)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("probability must be between 0 and 1");
    }

    // TC-05-V03: terminal branch with null value → 400
    @Test
    void terminalWithoutValue_throws400() {
        var root = decisionNode("root", List.of(
            new BranchDto("b1", "No value", null, null, null)
        ));

        assertThatThrownBy(() -> service.calculate(new DecisionTreeRequest(root)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("terminal value");
    }

    // nodeEmv map is populated for every node in the tree
    @Test
    void allNodeEmvsPopulated() {
        var chanceChild = chanceNode("c1", List.of(
            terminal("bA", "A", 0.6, 100.0),
            terminal("bB", "B", 0.4,  50.0)
        ));
        var root = decisionNode("root", List.of(
            withChild("b1", "Option A", chanceChild),
            terminal("b2", "Option B", null, 60.0)
        ));

        var result = service.calculate(new DecisionTreeRequest(root));

        assertThat(result.nodeEmv()).containsKeys("root", "c1");
        assertThat(result.nodeEmv().get("c1")).isCloseTo(80.0, within(1e-9));
    }

    // ── builders ──────────────────────────────────────────────────────────────

    private NodeDto chanceNode(String id, List<BranchDto> branches) {
        return new NodeDto(id, NodeKind.chance, id, branches);
    }

    private NodeDto decisionNode(String id, List<BranchDto> branches) {
        return new NodeDto(id, NodeKind.decision, id, branches);
    }

    private BranchDto terminal(String id, String label, Double prob, Double value) {
        return new BranchDto(id, label, prob, value, null);
    }

    private BranchDto withChild(String id, String label, NodeDto child) {
        return new BranchDto(id, label, null, null, child);
    }
}
