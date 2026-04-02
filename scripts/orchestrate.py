#!/usr/bin/env python3
"""
BMAD + OpenSpec Pipeline Orchestrator (Model B — Claude Code subagents)

A deterministic pipeline driver for the spec-anchored development workflow.
This script does NOT reason — it follows the defined sequence, invokes agents
via the `claude` CLI, enforces gate checks between phases, and handles
rework loops on failure.

Pipeline sequence:
    Discovery* -> Planner -> Architect -> Design* -> Sprint Loop:
        Generator -> Gate 1 (self-check) -> Gate 2 (Evaluator) -> Gate 3 (Reconciliation)
        With rework loops on failure (max retries from config, default 3)

    * = conditional invocation (skipped unless explicitly requested)

Usage:
    python3 scripts/orchestrate.py --sprint 1 --story S01-001
    python3 scripts/orchestrate.py --start-at evaluator --sprint 1 --story S01-001
    python3 scripts/orchestrate.py --start-at generator --sprint 2 --story S01-002 --dry-run

Environment:
    Requires `claude` CLI on PATH. If using nvm-managed Node.js, ensure nvm is
    sourced before invoking this script:
        source ~/.nvm/nvm.sh && python3 scripts/orchestrate.py ...
    Or use a wrapper shell script that sources nvm first.

    This script itself runs under system python3 (3.8+). No pip dependencies
    beyond PyYAML (install with: pip3 install pyyaml).

Exit codes:
    0 = pipeline completed successfully
    1 = retry needed (evaluator said RETRY, retries exhausted)
    2 = hard failure (evaluator said FAIL, or missing prerequisites)
"""

import argparse
import datetime
import logging
import os
import subprocess
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import yaml
except ImportError:
    print(
        "ERROR: PyYAML is required. Install with: pip3 install pyyaml",
        file=sys.stderr,
    )
    sys.exit(2)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PHASES = [
    "discovery",
    "planner",
    "architect",
    "design",
    "generator",
    "gate1",
    "evaluator",
    "reconciliation",
]

# Phases that are part of the sprint loop (subject to rework retries)
SPRINT_LOOP_PHASES = ["generator", "gate1", "evaluator", "reconciliation"]

# Phases that map to agent invocations via claude CLI
AGENT_PHASES = ["discovery", "planner", "architect", "design", "generator", "evaluator"]

# Conditional phases — skipped unless explicitly started at or forced
CONDITIONAL_PHASES = {"discovery", "design"}

PROJECT_ROOT = Path(__file__).resolve().parent.parent

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logger = logging.getLogger("orchestrate")


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
    logger.setLevel(level)
    logger.addHandler(handler)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def load_config() -> Dict[str, Any]:
    """Load harness configuration from .harness/config.yaml."""
    config_path = PROJECT_ROOT / ".harness" / "config.yaml"
    if not config_path.exists():
        logger.error("Config not found: %s", config_path)
        sys.exit(2)
    with open(config_path) as f:
        cfg = yaml.safe_load(f)
    return cfg.get("harness", cfg)


def get_agent_config(config: Dict[str, Any], agent_name: str) -> Dict[str, Any]:
    """Get configuration for a specific agent."""
    agents = config.get("agents", {})
    if agent_name not in agents:
        logger.error("Agent '%s' not found in config. Available: %s",
                      agent_name, list(agents.keys()))
        sys.exit(2)
    return agents[agent_name]


# ---------------------------------------------------------------------------
# Agent invocation
# ---------------------------------------------------------------------------

def build_agent_prompt(
    agent_name: str,
    agent_cfg: Dict[str, Any],
    sprint: str,
    story_id: str,
    retry_feedback: Optional[str] = None,
) -> str:
    """
    Construct the full prompt for an agent invocation.

    Reads the agent's prompt file and prepends contextual preamble with
    sprint number, story ID, and paths to read.
    """
    prompt_path = PROJECT_ROOT / agent_cfg["prompt"]
    if not prompt_path.exists():
        logger.error("Prompt file not found: %s", prompt_path)
        sys.exit(2)

    prompt_body = prompt_path.read_text()

    # Build preamble with context
    preamble_parts = [
        f"Sprint: {sprint}",
        f"Story: {story_id}",
        f"Project root: {PROJECT_ROOT}",
        f"Timestamp: {datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}",
    ]

    # Add file paths the agent should read
    reads = agent_cfg.get("reads", [])
    if reads:
        preamble_parts.append("")
        preamble_parts.append("Files to read at start (in order):")
        for i, path in enumerate(reads, 1):
            preamble_parts.append(f"  {i}. {path}")

    # Add sprint contract path if it exists
    contract_path = f".harness/contracts/sprint-{sprint}.yaml"
    if (PROJECT_ROOT / contract_path).exists():
        preamble_parts.append(f"\nSprint contract: {contract_path}")

    # Add story file path
    story_patterns = [
        f"epics/stories/{story_id}.md",
        f"epics/stories/{story_id.lower()}.md",
    ]
    for sp in story_patterns:
        if (PROJECT_ROOT / sp).exists():
            preamble_parts.append(f"Story file: {sp}")
            break

    # Add retry feedback from evaluator if this is a rework pass
    if retry_feedback:
        preamble_parts.append("")
        preamble_parts.append("=" * 60)
        preamble_parts.append("REWORK REQUIRED — Evaluator feedback from previous attempt:")
        preamble_parts.append("=" * 60)
        preamble_parts.append(retry_feedback)
        preamble_parts.append("=" * 60)

    preamble = "\n".join(preamble_parts)

    return f"--- CONTEXT ---\n{preamble}\n--- END CONTEXT ---\n\n{prompt_body}"


def run_agent(
    agent_name: str,
    config: Dict[str, Any],
    sprint: str,
    story_id: str,
    retry_feedback: Optional[str] = None,
    dry_run: bool = False,
) -> Tuple[int, str]:
    """
    Invoke a single agent via the claude CLI.

    Returns (exit_code, stdout_text).
    """
    agent_cfg = get_agent_config(config, agent_name)
    max_turns = agent_cfg.get("max_turns", 30)

    prompt_text = build_agent_prompt(
        agent_name, agent_cfg, sprint, story_id, retry_feedback
    )

    cmd = [
        "claude",
        "--print",
        "--dangerously-skip-permissions",
        "-p", prompt_text,
        "--max-turns", str(max_turns),
    ]

    logger.info("=" * 70)
    logger.info("INVOKING AGENT: %s", agent_name.upper())
    logger.info("  Model:     %s", agent_cfg.get("model", "default"))
    logger.info("  Max turns: %d", max_turns)
    logger.info("  Sprint:    %s", sprint)
    logger.info("  Story:     %s", story_id)
    if retry_feedback:
        logger.info("  Mode:      REWORK (with evaluator feedback)")
    logger.info("=" * 70)

    if dry_run:
        logger.info("[DRY RUN] Would invoke: claude --print --dangerously-skip-permissions "
                     "-p <prompt %d chars> --max-turns %d", len(prompt_text), max_turns)
        logger.debug("[DRY RUN] Prompt preview (first 500 chars):\n%s",
                      prompt_text[:500])
        return 0, "[dry run — no output]"

    start = datetime.datetime.utcnow()
    try:
        result = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=7200,  # 2 hour timeout
        )
        elapsed = (datetime.datetime.utcnow() - start).total_seconds()
        logger.info("Agent %s completed in %.1fs (exit code %d)",
                     agent_name, elapsed, result.returncode)

        if result.returncode != 0:
            logger.warning("Agent %s stderr:\n%s", agent_name,
                           result.stderr[:2000] if result.stderr else "(empty)")

        return result.returncode, result.stdout

    except subprocess.TimeoutExpired:
        elapsed = (datetime.datetime.utcnow() - start).total_seconds()
        logger.error("Agent %s timed out after %.1fs", agent_name, elapsed)
        return 2, ""
    except FileNotFoundError:
        logger.error(
            "claude CLI not found. Ensure it is installed and on PATH.\n"
            "If using nvm, source it first: source ~/.nvm/nvm.sh"
        )
        sys.exit(2)


# ---------------------------------------------------------------------------
# Gate checks
# ---------------------------------------------------------------------------

def read_evaluation_yaml(sprint: int) -> Optional[Dict[str, Any]]:
    """Read the evaluation report YAML for a given sprint."""
    eval_path = PROJECT_ROOT / ".harness" / "evaluations" / f"sprint-{sprint}-eval.yaml"
    if not eval_path.exists():
        logger.warning("Evaluation file not found: %s", eval_path)
        return None
    with open(eval_path) as f:
        return yaml.safe_load(f)


def read_generator_handoff() -> Optional[Dict[str, Any]]:
    """Read the generator's handoff YAML."""
    handoff_path = PROJECT_ROOT / ".harness" / "handoffs" / "generator-handoff.yaml"
    if not handoff_path.exists():
        logger.warning("Generator handoff not found: %s", handoff_path)
        return None
    with open(handoff_path) as f:
        return yaml.safe_load(f)


def gate1_self_check(sprint: int, story_id: str, dry_run: bool = False) -> str:
    """
    Gate 1: Generator self-check.

    Reads the generator handoff and checks whether the generator's own
    assessment indicates readiness for independent evaluation.

    Returns: "PASS", "RETRY", or "FAIL"
    """
    logger.info("-" * 50)
    logger.info("GATE 1: Generator Self-Check")
    logger.info("-" * 50)

    if dry_run:
        logger.info("[DRY RUN] Would read .harness/handoffs/generator-handoff.yaml")
        logger.info("[DRY RUN] Would check: status, critical_pass_rate, regression")
        return "PASS"

    handoff = read_generator_handoff()
    if handoff is None:
        logger.error("Gate 1 FAIL: Generator handoff file missing")
        return "FAIL"

    status = handoff.get("status", "unknown")
    if status == "blocked":
        logger.error("Gate 1 FAIL: Generator reports BLOCKED status")
        logger.error("  Reason: %s", handoff.get("self_assessment", {}).get("concerns", "unknown"))
        return "FAIL"

    assessment = handoff.get("self_assessment", {})
    critical_rate = assessment.get("critical_pass_rate", 0)
    regression = assessment.get("regression", False)
    confidence = assessment.get("confidence", 0)

    logger.info("  Generator status:       %s", status)
    logger.info("  Critical pass rate:     %.0f%%", critical_rate * 100)
    logger.info("  Regression:             %s", regression)
    logger.info("  Generator confidence:   %.0f%%", confidence * 100)

    if regression:
        logger.error("Gate 1 FAIL: Generator reports regression in existing tests")
        return "RETRY"

    if critical_rate < 1.0:
        logger.error("Gate 1 FAIL: Not all critical scenarios pass (%.0f%%)",
                      critical_rate * 100)
        return "RETRY"

    if status == "partial":
        logger.warning("Gate 1 PASS (with concerns): Generator reports partial completion")
    else:
        logger.info("Gate 1 PASS")

    return "PASS"


def gate2_evaluator(
    config: Dict[str, Any],
    sprint: str,
    story_id: str,
    dry_run: bool = False,
) -> Tuple[str, Optional[str]]:
    """
    Gate 2: Independent evaluator verification.

    Invokes the evaluator agent, then reads its verdict from the evaluation YAML.

    Returns: (verdict, retry_guidance)
        verdict: "PASS", "RETRY", or "FAIL"
        retry_guidance: feedback text if verdict is RETRY, else None
    """
    logger.info("-" * 50)
    logger.info("GATE 2: Evaluator Verification")
    logger.info("-" * 50)

    # Invoke the evaluator agent
    exit_code, output = run_agent("evaluator", config, sprint, story_id, dry_run=dry_run)

    if dry_run:
        logger.info("[DRY RUN] Would read .harness/evaluations/sprint-%s-eval.yaml", sprint)
        return "PASS", None

    if exit_code != 0:
        logger.error("Evaluator agent failed with exit code %d", exit_code)
        # Still try to read the evaluation file — agent may have written it before erroring
        eval_data = read_evaluation_yaml(sprint)
        if eval_data is None:
            logger.error("No evaluation file produced. Treating as RETRY.")
            return "RETRY", "Evaluator agent crashed without producing an evaluation report."

    eval_data = read_evaluation_yaml(sprint)
    if eval_data is None:
        logger.error("Gate 2: No evaluation file found after evaluator ran")
        return "RETRY", "Evaluator did not produce an evaluation report."

    verdict = eval_data.get("verdict", "FAIL").upper()
    weighted_score = eval_data.get("weighted_score", 0)
    retry_guidance = eval_data.get("retry_guidance")

    logger.info("  Verdict:        %s", verdict)
    logger.info("  Weighted score: %.2f", weighted_score)

    # Log issue summary
    issues = eval_data.get("issues", {})
    for severity in ["blockers", "critical", "warnings"]:
        items = issues.get(severity, [])
        if items:
            logger.info("  %s:", severity.capitalize())
            for item in items:
                logger.info("    - %s", item)

    if verdict not in ("PASS", "RETRY", "FAIL"):
        logger.warning("Unknown verdict '%s', treating as RETRY", verdict)
        verdict = "RETRY"

    return verdict, retry_guidance


def gate3_reconciliation(
    config: Dict[str, Any],
    sprint: str,
    story_id: str,
    dry_run: bool = False,
) -> str:
    """
    Gate 3: Reconciliation — ensure all artifacts are consistent.

    Invokes the generator agent with a reconciliation-focused prompt to update
    specs, stories, traceability, ops docs, etc.

    Returns: "PASS" or "INCOMPLETE"
    """
    logger.info("-" * 50)
    logger.info("GATE 3: Reconciliation")
    logger.info("-" * 50)

    reconciliation_prompt = build_reconciliation_prompt(sprint, story_id)

    if dry_run:
        logger.info("[DRY RUN] Would invoke generator agent with reconciliation prompt")
        logger.info("[DRY RUN] Would verify reconciliation artifacts exist")
        return "PASS"

    generator_cfg = get_agent_config(config, "generator")
    max_turns = min(generator_cfg.get("max_turns", 30), 50)

    cmd = [
        "claude",
        "--print",
        "--dangerously-skip-permissions",
        "-p", reconciliation_prompt,
        "--max-turns", str(max_turns),
    ]

    logger.info("Invoking generator for reconciliation (max %d turns)...", max_turns)

    start = datetime.datetime.utcnow()
    try:
        result = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=3600,  # 1 hour timeout for reconciliation
        )
        elapsed = (datetime.datetime.utcnow() - start).total_seconds()
        logger.info("Reconciliation completed in %.1fs (exit code %d)",
                     elapsed, result.returncode)
    except subprocess.TimeoutExpired:
        logger.error("Reconciliation timed out")
        return "INCOMPLETE"

    # Verify reconciliation artifacts
    artifacts = check_reconciliation_artifacts(sprint, story_id)
    if not artifacts["all_present"]:
        logger.warning("Gate 3 INCOMPLETE: Missing reconciliation artifacts:")
        for name, present in artifacts["items"].items():
            status = "OK" if present else "MISSING"
            logger.info("  [%s] %s", status, name)
        return "INCOMPLETE"

    logger.info("Gate 3 PASS: All reconciliation artifacts present")
    return "PASS"


def build_reconciliation_prompt(sprint: int, story_id: str) -> str:
    """Build a reconciliation-specific prompt for the generator agent."""
    return textwrap.dedent(f"""\
        You are performing RECONCILIATION for Sprint {sprint}, Story {story_id}.

        This is Gate 3 of the evaluation pipeline. The generator has implemented
        the story and the evaluator has approved it. Your job now is to update
        all project artifacts to reflect the completed work.

        Read the following files to understand what was implemented:
        - .harness/handoffs/generator-handoff.yaml
        - .harness/evaluations/sprint-{sprint}-eval.yaml
        - epics/stories/{story_id}.md (or lowercase variant)

        Then perform ALL of these reconciliation steps:

        1. Update openspec/capabilities/*/spec.md — Implementation Status section
           Mark each implemented REQ-* as IMPLEMENTED.

        2. Update the story file — set status to Done, check all acceptance criteria boxes.

        3. Update the epic file — update the story table row to show Done status.

        4. Update _bmad/traceability.md — Impl Status column for affected FRs.

        5. Update ops/status.md — What is working now and what is next.

        6. Update ops/changelog.md — Log what was done this sprint.

        7. Update ops/test-results.md — Current E2E test results.

        Do NOT skip any step. Each update should be minimal and accurate.
        Do NOT modify source code — only update documentation and spec files.
    """)


def check_reconciliation_artifacts(sprint: int, story_id: str) -> Dict[str, Any]:
    """
    Check whether the expected reconciliation artifacts exist and were
    recently modified.
    """
    now = datetime.datetime.utcnow().timestamp()
    # Consider files "recently modified" if touched in the last 30 minutes
    recency_threshold = 1800

    checks = {
        "ops/status.md": PROJECT_ROOT / "ops" / "status.md",
        "ops/changelog.md": PROJECT_ROOT / "ops" / "changelog.md",
        "_bmad/traceability.md": PROJECT_ROOT / "_bmad" / "traceability.md",
    }

    results = {}
    for name, path in checks.items():
        if path.exists():
            mtime = path.stat().st_mtime
            recently_modified = (now - mtime) < recency_threshold
            results[name] = recently_modified
        else:
            results[name] = False

    all_present = all(results.values())
    return {"all_present": all_present, "items": results}


# ---------------------------------------------------------------------------
# Pipeline orchestration
# ---------------------------------------------------------------------------

def resolve_start_index(start_at: str) -> int:
    """Convert a phase name to its index in the PHASES list."""
    # Map some aliases
    aliases = {
        "gate1": "gate1",
        "gate_1": "gate1",
        "self-check": "gate1",
        "selfcheck": "gate1",
        "gate2": "evaluator",
        "gate_2": "evaluator",
        "gate3": "reconciliation",
        "gate_3": "reconciliation",
        "reconcile": "reconciliation",
        "recon": "reconciliation",
        "generate": "generator",
        "eval": "evaluator",
        "plan": "planner",
        "discover": "discovery",
    }
    phase = aliases.get(start_at.lower(), start_at.lower())

    if phase not in PHASES:
        logger.error("Unknown phase '%s'. Valid phases: %s", start_at, PHASES)
        sys.exit(2)
    return PHASES.index(phase)


def validate_prerequisites(start_phase: str, sprint: int, story_id: str) -> List[str]:
    """
    Check that expected prerequisite artifacts exist for the given start phase.
    Returns a list of warnings (empty if all prerequisites met).
    """
    warnings = []

    # Phases in the sprint loop need a sprint contract
    if start_phase in SPRINT_LOOP_PHASES or start_phase in ("generator", "evaluator", "reconciliation"):
        contract = PROJECT_ROOT / ".harness" / "contracts" / f"sprint-{sprint}.yaml"
        if not contract.exists():
            warnings.append(f"Sprint contract not found: {contract.relative_to(PROJECT_ROOT)}")

    # Evaluator needs generator handoff
    if start_phase in ("evaluator", "gate1"):
        handoff = PROJECT_ROOT / ".harness" / "handoffs" / "generator-handoff.yaml"
        if not handoff.exists():
            warnings.append(f"Generator handoff not found: {handoff.relative_to(PROJECT_ROOT)}")

    # Reconciliation needs evaluation
    if start_phase == "reconciliation":
        eval_file = PROJECT_ROOT / ".harness" / "evaluations" / f"sprint-{sprint}-eval.yaml"
        if not eval_file.exists():
            warnings.append(f"Evaluation file not found: {eval_file.relative_to(PROJECT_ROOT)}")

    return warnings


def run_pipeline(
    config: Dict[str, Any],
    sprint: str,
    story_id: str,
    start_at: str = "discovery",
    dry_run: bool = False,
    force_conditional: bool = False,
) -> int:
    """
    Execute the pipeline from the given starting phase.

    Returns exit code: 0=success, 1=retry exhausted, 2=hard fail.
    """
    max_retries = config.get("max_retries_per_sprint", 3)
    start_index = resolve_start_index(start_at)

    logger.info("=" * 70)
    logger.info("BMAD PIPELINE ORCHESTRATOR")
    logger.info("=" * 70)
    logger.info("  Sprint:      %s", sprint)
    logger.info("  Story:       %s", story_id)
    logger.info("  Start at:    %s (index %d)", PHASES[start_index], start_index)
    logger.info("  Max retries: %d", max_retries)
    logger.info("  Dry run:     %s", dry_run)
    logger.info("  Project:     %s", PROJECT_ROOT)
    logger.info("=" * 70)

    # Validate prerequisites
    prereq_warnings = validate_prerequisites(PHASES[start_index], sprint, story_id)
    if prereq_warnings:
        logger.warning("Prerequisite warnings:")
        for w in prereq_warnings:
            logger.warning("  - %s", w)
        if not dry_run:
            logger.warning("Continuing despite warnings — agents may fail if artifacts are missing.")

    # Phase 1: Run pre-sprint phases (discovery through design)
    pre_sprint_phases = [p for p in PHASES[:4] if PHASES.index(p) >= start_index]
    for phase in pre_sprint_phases:
        if phase in CONDITIONAL_PHASES and not force_conditional:
            # Only run if we are explicitly starting at this phase
            if PHASES.index(phase) != start_index:
                logger.info("Skipping conditional phase: %s", phase)
                continue

        if phase in AGENT_PHASES:
            exit_code, output = run_agent(phase, config, sprint, story_id, dry_run=dry_run)
            if exit_code != 0 and not dry_run:
                logger.error("Phase %s failed with exit code %d", phase, exit_code)
                return 2

    # Phase 2: Sprint loop (generator -> gate1 -> gate2 -> gate3) with retries
    sprint_start = max(start_index, PHASES.index("generator"))
    if start_index > PHASES.index("reconciliation"):
        # Nothing to do — start_at was beyond the last phase
        logger.info("Start phase is beyond pipeline end. Nothing to do.")
        return 0

    retry_feedback: Optional[str] = None
    attempt = 0

    while attempt <= max_retries:
        if attempt > 0:
            logger.info("")
            logger.info("=" * 70)
            logger.info("REWORK ATTEMPT %d / %d", attempt, max_retries)
            logger.info("=" * 70)

        # Determine which sprint-loop phases to run this iteration
        if attempt == 0:
            # First attempt: start from wherever start_at placed us in the sprint loop
            loop_start = sprint_start
        else:
            # Rework: always restart from generator
            loop_start = PHASES.index("generator")

        # --- Generator ---
        if loop_start <= PHASES.index("generator"):
            exit_code, output = run_agent(
                "generator", config, sprint, story_id,
                retry_feedback=retry_feedback,
                dry_run=dry_run,
            )
            if exit_code != 0 and not dry_run:
                logger.error("Generator failed with exit code %d", exit_code)
                return 2

        # --- Gate 1: Self-check ---
        if loop_start <= PHASES.index("gate1"):
            g1_result = gate1_self_check(sprint, story_id, dry_run=dry_run)
            if g1_result == "FAIL":
                logger.error("Gate 1 hard fail — cannot proceed")
                return 2
            if g1_result == "RETRY":
                attempt += 1
                retry_feedback = (
                    "Gate 1 (self-check) failed. The generator's own handoff "
                    "indicates problems. Re-read .harness/handoffs/generator-handoff.yaml "
                    "for details on what needs to be fixed."
                )
                if attempt > max_retries:
                    logger.error("Gate 1 retries exhausted (%d attempts)", max_retries)
                    return 1
                continue

        # --- Gate 2: Evaluator ---
        if loop_start <= PHASES.index("evaluator"):
            g2_verdict, g2_feedback = gate2_evaluator(config, sprint, story_id, dry_run=dry_run)
            if g2_verdict == "FAIL":
                logger.error("Gate 2 hard FAIL — sprint cannot continue")
                return 2
            if g2_verdict == "RETRY":
                attempt += 1
                retry_feedback = g2_feedback or (
                    "Evaluator returned RETRY. Re-read "
                    f".harness/evaluations/sprint-{sprint}-eval.yaml "
                    "for detailed feedback on what to fix."
                )
                if attempt > max_retries:
                    logger.error("Gate 2 retries exhausted (%d attempts)", max_retries)
                    return 1
                continue

        # --- Gate 3: Reconciliation ---
        if loop_start <= PHASES.index("reconciliation"):
            g3_result = gate3_reconciliation(config, sprint, story_id, dry_run=dry_run)
            if g3_result == "INCOMPLETE":
                # Reconciliation failure is not a rework — it means docs are missing.
                # Try once more, then warn and succeed anyway (docs can be fixed manually).
                logger.warning("Reconciliation incomplete — retrying once...")
                g3_result = gate3_reconciliation(config, sprint, story_id, dry_run=dry_run)
                if g3_result == "INCOMPLETE":
                    logger.warning(
                        "Reconciliation still incomplete after retry. "
                        "Some ops/spec docs may need manual updates."
                    )
                    # Do not fail the pipeline for missing docs — warn and continue

        # All gates passed
        logger.info("")
        logger.info("=" * 70)
        logger.info("PIPELINE COMPLETE — Sprint %s, Story %s", sprint, story_id)
        logger.info("  Attempts: %d", attempt + 1)
        logger.info("=" * 70)
        return 0

    # Should not reach here, but just in case
    logger.error("Pipeline terminated unexpectedly")
    return 1


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="BMAD + OpenSpec Pipeline Orchestrator (Model B)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              # Full pipeline for sprint 1
              python3 scripts/orchestrate.py --sprint 1 --story S01-001

              # Start at evaluator (skip discovery/planner/architect/design/generator)
              python3 scripts/orchestrate.py --start-at evaluator --sprint 1 --story S01-001

              # Start at generator with rework context
              python3 scripts/orchestrate.py --start-at generator --sprint 2 --story S01-002

              # Dry run to see what would happen
              python3 scripts/orchestrate.py --sprint 1 --story S01-001 --dry-run

              # Include conditional phases (discovery + design)
              python3 scripts/orchestrate.py --sprint 1 --story S01-001 --include-conditional

            Phases (in order):
              discovery*  -> planner -> architect -> design* -> generator ->
              gate1       -> evaluator -> reconciliation

              * = conditional, skipped unless --include-conditional or --start-at targets them

            Environment:
              Requires `claude` CLI on PATH. If using nvm:
                source ~/.nvm/nvm.sh && python3 scripts/orchestrate.py ...
        """),
    )

    parser.add_argument(
        "--sprint", "-s",
        type=str,
        required=True,
        help="Sprint identifier (number or name, e.g., '1' or 'retro-eval')",
    )
    parser.add_argument(
        "--story",
        type=str,
        required=True,
        help="Story ID (e.g., S01-001)",
    )
    parser.add_argument(
        "--start-at",
        type=str,
        default="planner",
        metavar="PHASE",
        help=(
            "Phase to start at (default: planner). "
            "Options: discovery, planner, architect, design, generator, "
            "gate1, evaluator, reconciliation"
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without executing agents",
    )
    parser.add_argument(
        "--include-conditional",
        action="store_true",
        help="Force conditional phases (discovery, design) to run",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable debug logging",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    setup_logging(verbose=args.verbose)

    # Ensure project root looks right
    if not (PROJECT_ROOT / ".harness" / "config.yaml").exists():
        logger.error(
            "Cannot find .harness/config.yaml relative to script location.\n"
            "Expected project root: %s", PROJECT_ROOT
        )
        return 2

    config = load_config()

    exit_code = run_pipeline(
        config=config,
        sprint=args.sprint,
        story_id=args.story,
        start_at=args.start_at,
        dry_run=args.dry_run,
        force_conditional=args.include_conditional,
    )

    if exit_code == 0:
        logger.info("Exit: SUCCESS (0)")
    elif exit_code == 1:
        logger.error("Exit: RETRY EXHAUSTED (1)")
    else:
        logger.error("Exit: HARD FAIL (2)")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
