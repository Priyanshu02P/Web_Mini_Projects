const mongoose = require('mongoose');

/**
 * Pre-aggregated per-user, per-day productivity counters. Updated
 * asynchronously by analytics event handlers ($inc), so reading analytics is
 * a cheap lookup instead of re-scanning every task.
 */
const dailyStatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD' (UTC)
    created: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    reopened: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },
    remindersFired: { type: Number, default: 0 },
    completionMsTotal: { type: Number, default: 0 }, // sum of (completedAt - createdAt)
  },
  { timestamps: true }
);

dailyStatSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyStat', dailyStatSchema);
