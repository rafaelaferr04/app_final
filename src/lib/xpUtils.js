/**
 * Calculates the correct total XP for a user:
 *   = XP from unlocked achievements (universal)
 *   + XP from completed courses that belong to the user's current financial goal
 *
 * @param {object} params
 * @param {Array}  params.achievements       - Achievement records from DB (have achievement_id)
 * @param {Array}  params.allAchievements    - Static ALL_ACHIEVEMENTS definition (have id + xp)
 * @param {Array}  params.courseProgressList - CourseProgress records from DB (have course_id, completed, xp_earned)
 * @param {Array}  params.allCourses         - Static ALL_COURSES definition (have id, goals, xp_reward)
 * @param {string} params.financialGoal      - User's financial_goal setting (e.g. 'reduce_debt')
 * @returns {number} total XP
 */
export function calculateTotalXP({ achievements = [], unlockedAchievementIds: unlockedIds, allAchievements, courseProgressList, allCourses, financialGoal }) {
  // 1. XP from unlocked achievements
  // Accept either a pre-computed array of IDs (unlockedAchievementIds) or DB achievement records
  const unlockedAchievementIds = unlockedIds
    ? new Set(unlockedIds)
    : new Set(achievements.map(a => a.achievement_id));
  const achievementsXP = allAchievements
    .filter(a => unlockedAchievementIds.has(a.id))
    .reduce((sum, a) => sum + (a.xp || 0), 0);

  // 2. XP from completed courses that belong to the user's goal (or 'all')
  const goalCourseIds = new Set(
    allCourses
      .filter(c => !financialGoal || c.goals.includes('all') || c.goals.includes(financialGoal))
      .map(c => c.id)
  );

  const coursesXP = courseProgressList
    .filter(p => p.completed && goalCourseIds.has(p.course_id))
    .reduce((sum, p) => sum + (p.xp_earned || 0), 0);

  return achievementsXP + coursesXP;
}