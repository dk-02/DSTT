import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from database import engine
from models import CaseCategory, Category, PersonalStatsResponse, TopicStat, User, Role, UserRole, Group, GroupMember, SolveAttempt, AttemptLog, Case, DiagnosisSubmission, Institution, Assignment, GroupAssignment
from routes.auth import get_current_active_user

router = APIRouter(prefix="/statistics", tags=["Statistics"])

def get_session():
    with Session(engine) as session:
        yield session

def get_user_roles(session: Session, user_id: uuid.UUID) -> List[str]:
    return session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == user_id)).all()


@router.get("/me", response_model=PersonalStatsResponse)
def get_my_statistics(is_practice: bool = True, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    # Dohvaćanje svih završenih/terminiranih pokušaja ovog korisnika uz naziv kategorije slučaja
    stmt = (
        select(SolveAttempt, Category.name)
        .join(Case, SolveAttempt.case_id == Case.id)
        .outerjoin(CaseCategory, Case.id == CaseCategory.case_id)
        .outerjoin(Category, CaseCategory.category_id == Category.id)
        .where(SolveAttempt.user_id == current_user.id)
        .where(SolveAttempt.status.in_(["completed", "terminated"]))
        .where(SolveAttempt.is_practice == is_practice)
    )
    
    results = session.exec(stmt).all()
    
    total_attempts = len(results)
    
    # Ako student nema još nijedan riješen slučaj, vraćamo nule
    if total_attempts == 0:
        return PersonalStatsResponse(
            total_completed_cases=0,
            success_rate_percentage=0.0,
            avg_methodology_percentage=0.0,
            avg_independence_percentage=0.0,
            strongest_topics=[],
            weakest_topics=[]
        )

    successful_attempts = 0
    sum_methodology = 0.0
    sum_independence = 0.0
    
    # Rječnik za praćenje statistike po temama (kategorijama)
    topic_data: Dict[str, Dict[str, int]] = {}

    for attempt, cat_name in results:
        topic = cat_name or "Bez teme"
        if topic not in topic_data:
            topic_data[topic] = {"total": 0, "successful": 0}
            
        topic_data[topic]["total"] += 1
        
        # Čitanje JSON izvještaja
        report = attempt.evaluation_report or {}
        metrics = report.get("metrics", {})
        
        # Točnost
        if metrics.get("accuracy", {}).get("verdict") == "correct":
            successful_attempts += 1
            topic_data[topic]["successful"] += 1
            
        # Zbrajanje metodičnosti i samostalnosti
        sum_methodology += metrics.get("methodology", {}).get("score_percentage", 0)
        sum_independence += metrics.get("independence", {}).get("score_percentage", 0)

    # Izrada liste objekata za tematsku analizu
    topic_stats_list = []
    for topic, data in topic_data.items():
        topic_stats_list.append(
            TopicStat(
                topic_name=topic,
                total_attempts=data["total"],
                success_rate_percentage=round((data["successful"] / data["total"]) * 100, 2)
            )
        )

    # Filtriranje prema pragu uspješnosti (70%)
    strong_candidates = [t for t in topic_stats_list if t.success_rate_percentage >= 70.0]
    weak_candidates = [t for t in topic_stats_list if t.success_rate_percentage < 70.0]
        
    # Sortiranje jakih
    # Ako je postotak isti, viša je ona s više pokušaja
    strong_candidates.sort(key=lambda x: (x.success_rate_percentage, x.total_attempts), reverse=True)
    strongest_topics = strong_candidates[:3]

    # Sortiranje slabih
    # Koristi se -x.total_attempts jer ako student ima 0% iz dvije teme, ona u kojoj je pao 5 puta je "kritičnija" od one u kojoj je pao jednom
    weak_candidates.sort(key=lambda x: (x.success_rate_percentage, -x.total_attempts))
    weakest_topics = weak_candidates[:3]

    return PersonalStatsResponse(
        total_completed_cases=total_attempts,
        success_rate_percentage=round((successful_attempts / total_attempts) * 100, 2),
        avg_methodology_percentage=round(sum_methodology / total_attempts, 2),
        avg_independence_percentage=round(sum_independence / total_attempts, 2),
        strongest_topics=strongest_topics,
        weakest_topics=weakest_topics
    )



@router.get("/group-analytics")
def get_group_statistics(is_practice: bool = True, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    roles = get_user_roles(session, current_user.id)
    if "teacher" not in roles:
        raise HTTPException(status_code=403, detail="Nemate ovlasti nastavnika.")

    # 1. Pronađi sve grupe ovog nastavnika
    groups = session.exec(select(Group).where(Group.teacher_id == current_user.id)).all()
    
    group_stats = []
    mistakes_counter = {}

    for group in groups:
        # Dohvati studente u grupi
        students = session.exec(select(User).join(GroupMember).where(GroupMember.group_id == group.id)).all()
        student_stats_list = []

        for student in students:
            # Dohvati sve pokušaje ovog studenta za zadaće koje su dodijeljene ovoj grupi
            stmt = (
                select(SolveAttempt)
                .join(GroupAssignment, SolveAttempt.assignment_id == GroupAssignment.assignment_id)
                .where(GroupAssignment.group_id == group.id)
                .where(SolveAttempt.user_id == student.id)
                .where(SolveAttempt.status.in_(["completed", "terminated"]))
                .where(SolveAttempt.is_practice == is_practice)
            )
            attempts = session.exec(stmt).all()
            
            total_attempts = len(attempts)
            if total_attempts == 0:
                continue

            successful_attempts = 0
            sum_methodology = 0.0
            sum_independence = 0.0

            for att in attempts:
                report = att.evaluation_report or {}
                metrics = report.get("metrics", {})
                
                # Uspješnost
                if metrics.get("accuracy", {}).get("verdict") == "correct":
                    successful_attempts += 1
                
                # Metodičnost i samostalnost
                sum_methodology += metrics.get("methodology", {}).get("score_percentage", 0)
                sum_independence += metrics.get("independence", {}).get("score_percentage", 0)

                # Skupljanje grešaka za "Top Mistakes"
                logs = session.exec(select(AttemptLog).where(AttemptLog.attempt_id == att.id)).all()
                for log in logs:
                    if log.status in ["consequence_mistake", "fatal_mistake"] and log.diagnostic_unit_id:
                        du_id_str = str(log.diagnostic_unit_id)
                        desc = log.event_result_data.get("student_question", "Nepoznata radnja")
                        
                        if du_id_str not in mistakes_counter:
                            mistakes_counter[du_id_str] = {"desc": desc, "type": log.status, "count": 0}
                        mistakes_counter[du_id_str]["count"] += 1

            student_stats_list.append({
                "student_id": str(student.id),
                "first_name": student.first_name or "Nepoznato",
                "last_name": student.last_name or "",
                "total_attempts": total_attempts,
                "success_rate_percentage": round((successful_attempts / total_attempts) * 100, 2),
                "avg_methodology": round(sum_methodology / total_attempts, 2),
                "avg_independence": round(sum_independence / total_attempts, 2)
            })

        group_stats.append({
            "group_id": str(group.id),
            "group_name": group.name,
            "student_stats": student_stats_list
        })

    # Sortiranje grešaka (Top 3 najčešće)
    sorted_mistakes = sorted(mistakes_counter.items(), key=lambda x: x[1]["count"], reverse=True)[:3]
    top_mistakes = [
        {
            "du_id": k, 
            "description": v["desc"], 
            "mistake_type": v["type"], 
            "count": v["count"]
        } for k, v in sorted_mistakes
    ]

    return {"groups": group_stats, "common_mistakes": top_mistakes}


@router.get("/case-analytics")
def get_case_statistics(is_practice: bool = True, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    roles = get_user_roles(session, current_user.id)
    if "teacher" not in roles and "expert" not in roles:
        raise HTTPException(status_code=403, detail="Nemate ovlasti za pristup ovim podatcima.")

    # Dohvati sve objavljene slučajeve ovog korisnika
    cases = session.exec(select(Case).where(Case.created_by == current_user.id, Case.status == "published")).all()
    
    case_stats = []

    for case in cases:
        attempts = session.exec(
            select(SolveAttempt)
            .where(SolveAttempt.case_id == case.id)
            .where(SolveAttempt.status.in_(["completed", "terminated"]))
            .where(SolveAttempt.is_practice == is_practice)
        ).all()

        total_attempts = len(attempts)
        if total_attempts == 0:
            continue

        successful = 0
        sum_money = 0.0
        sum_time = 0
        hints_used_attempts = 0

        for att in attempts:
            report = att.evaluation_report or {}
            metrics = report.get("metrics", {})

            if metrics.get("accuracy", {}).get("verdict") == "correct":
                successful += 1
            
            eff = metrics.get("efficiency", {})

            # Računamo ukupni trošak (osnovno + kazne)
            sum_money += eff.get("total_cost_money", 0) + eff.get("penalty_cost_money", 0)
            sum_time += eff.get("total_cost_time_seconds", 0) + eff.get("penalty_cost_time_seconds", 0)

            ind = metrics.get("independence", {})
            if ind.get("total_hints_used", 0) > 0:
                hints_used_attempts += 1

        case_stats.append({
            "case_id": str(case.id),
            "title": case.title,
            "total_attempts": total_attempts,
            "success_rate_percentage": round((successful / total_attempts) * 100, 2),
            "avg_money_spent": round(sum_money / total_attempts, 2),
            "avg_time_spent_seconds": int(sum_time / total_attempts),
            "hint_usage_rate_percentage": round((hints_used_attempts / total_attempts) * 100, 2)
        })

    return {"cases": case_stats}


@router.get("/system-monitoring")
def get_system_statistics(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    roles = get_user_roles(session, current_user.id)
    if "admin" not in roles:
        raise HTTPException(status_code=403, detail="Nemate admin ovlasti.")

    total_users = len(session.exec(select(User)).all())
    total_institutions = len(session.exec(select(Institution)).all())
    
    all_cases = session.exec(select(Case)).all()
    total_cases = len(all_cases)
    public_cases = sum(1 for c in all_cases if c.is_public)

    total_attempts = len(session.exec(select(SolveAttempt)).all())
    
    # LLM upiti (mentor_request)
    llm_queries = len(session.exec(select(AttemptLog).where(AttemptLog.event_type == "mentor_request")).all())
    
    # LLM upiti (evaluacija dijagnoze)
    diagnosis_submissions = len(session.exec(select(DiagnosisSubmission)).all())

    return {
        "total_users": total_users,
        "total_institutions": total_institutions,
        "total_cases": total_cases,
        "public_cases_count": public_cases,
        "total_solve_attempts": total_attempts,
        "total_llm_mentor_queries": llm_queries,
        "total_diagnosis_submissions": diagnosis_submissions
    }