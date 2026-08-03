import React from 'react';
import TaskItem from './TaskItem';
import './TaskList.css';

export default function TaskList({ tasks, onPatch, onDelete }) {
  if (tasks.length === 0) {
    return (
      <div className="tasklist__empty">
        <p>The page is blank.</p>
        <p className="tasklist__empty-sub">Add your first entry above to start the register.</p>
      </div>
    );
  }

  return (
    <ul className="tasklist">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onPatch={onPatch} onDelete={onDelete} />
      ))}
    </ul>
  );
}
