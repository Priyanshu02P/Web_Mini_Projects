const mongoose = require('mongoose');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../config/constants');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      minlength: [1, 'title cannot be empty'],
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: `status must be one of: ${TASK_STATUSES.join(', ')}`,
      },
      default: 'pending',
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITIES,
        message: `priority must be one of: ${TASK_PRIORITIES.join(', ')}`,
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Trim whitespace from the title before every save, so " Buy milk  "
// is persisted (and validated) as "Buy milk".
taskSchema.pre('save', function trimTitle(next) {
  if (this.title && typeof this.title === 'string') {
    this.title = this.title.trim();
  }
  next();
});

// Also trim on findOneAndUpdate-style updates (e.g. PUT/PATCH going through
// Model.findByIdAndUpdate), since pre('save') only fires on .save().
taskSchema.pre(['findOneAndUpdate'], function trimTitleOnUpdate(next) {
  const update = this.getUpdate() || {};
  if (typeof update.title === 'string') {
    update.title = update.title.trim();
  }
  if (update.$set && typeof update.$set.title === 'string') {
    update.$set.title = update.$set.title.trim();
  }
  this.setUpdate(update);
  next();
});

taskSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Task', taskSchema);
