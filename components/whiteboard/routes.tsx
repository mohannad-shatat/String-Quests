import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WhiteboardLoginPage } from './WhiteboardLoginPage';
import { SpacesPage } from './SpacesPage';
import { SpaceDetailPage } from './SpaceDetailPage';
import { LessonPage } from './LessonPage';
import { AttendancePage } from './AttendancePage';
import type { Space } from './spaces';

/**
 * Route wrappers. The screens themselves stay router-free so the standalone
 * build can drive them with its own navigation.
 */

export const LoginRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <WhiteboardLoginPage
      onBack={() => navigate('/home')}
      onSubmit={() => navigate('/spaces')}
      onScan={() => navigate('/spaces')}
    />
  );
};

export const SpacesRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <SpacesPage onOpenSpace={(space: Space) => navigate(`/spaces/${space.id}`)} />
  );
};

export const SpaceDetailRoute: React.FC = () => {
  const navigate = useNavigate();
  const { spaceId } = useParams();
  return (
    <SpaceDetailPage
      spaceId={spaceId}
      onBack={() => navigate('/spaces')}
      onOpenLesson={(lesson) => navigate(`/spaces/${spaceId}/${lesson.id}`)}
      onAttendance={() => navigate(`/spaces/${spaceId}/attendance`)}
    />
  );
};

export const LessonRoute: React.FC = () => {
  const navigate = useNavigate();
  const { spaceId, lessonId } = useParams();
  return (
    <LessonPage
      spaceId={spaceId}
      lessonId={lessonId}
      onBack={() => navigate(`/spaces/${spaceId}`)}
    />
  );
};

export const AttendanceRoute: React.FC = () => {
  const navigate = useNavigate();
  const { spaceId } = useParams();
  return (
    <AttendancePage
      spaceId={spaceId}
      onBack={() => navigate('/spaces')}
      onLessons={() => navigate(`/spaces/${spaceId}`)}
    />
  );
};
