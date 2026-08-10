const mongoose = require('mongoose');

/**
 * NOTE: passwords are stored in PLAIN TEXT on purpose. This is a documented,
 * deliberate simplification for a learning project (see MATURITY.md / README
 * "Auth" section) - the original file-store version worked the same way.
 * Never do this in a real application.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'password is required'],
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
