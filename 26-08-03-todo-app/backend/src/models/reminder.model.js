const mongoose = require('mongoose');

/** A reminder notification that has fired for a task (the user's inbox). */
const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    remindAt: { type: Date, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reminderSchema.index({ userId: 1, createdAt: -1 });

reminderSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId.toString();
    ret.taskId = ret.taskId.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Reminder', reminderSchema);
