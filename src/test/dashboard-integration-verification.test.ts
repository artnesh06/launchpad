/**
 * Dashboard Integration Verification
 * 
 * This script verifies that the dashboard page correctly integrates with:
 * - useAdminStats hook for real-time statistics
 * - useAdminActivity hook for recent activities
 * - Real navigation links for quick actions
 * 
 * Requirements validated:
 * - 1.1, 1.2, 1.3, 1.4, 1.5 (Stats integration)
 * - 7.1, 7.2, 7.3, 7.4, 7.5 (Activity integration)
 * - Navigation links to banners, collections, and analytics pages
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Dashboard Integration Verification', () => {
  const dashboardPath = path.join(process.cwd(), 'src/app/admin/page.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');

  it('should import useAdminStats hook', () => {
    expect(dashboardContent).toContain("import { useAdminStats } from '@/hooks/useAdminStats'");
  });

  it('should import useAdminActivity hook', () => {
    expect(dashboardContent).toContain("import { useAdminActivity } from '@/hooks/useAdminActivity'");
  });

  it('should use useAdminStats hook', () => {
    expect(dashboardContent).toContain('const { stats, isLoading, error, refetch } = useAdminStats()');
  });

  it('should use useAdminActivity hook with limit of 10', () => {
    expect(dashboardContent).toContain('useAdminActivity(10)');
  });

  it('should display loading state for stats', () => {
    expect(dashboardContent).toContain('isLoading ?');
    expect(dashboardContent).toContain('<Skeleton');
  });

  it('should display error state for stats', () => {
    expect(dashboardContent).toContain('error ?');
    expect(dashboardContent).toContain('Error loading statistics');
  });

  it('should display loading state for activities', () => {
    expect(dashboardContent).toContain('isLoadingActivities ?');
  });

  it('should display error state for activities', () => {
    expect(dashboardContent).toContain('activitiesError ?');
    expect(dashboardContent).toContain('Error loading activities');
  });

  it('should display empty state for activities', () => {
    expect(dashboardContent).toContain('activities.length === 0');
    expect(dashboardContent).toContain('No recent activity');
  });

  it('should display real stats data', () => {
    expect(dashboardContent).toContain('stats.totalCollections');
    expect(dashboardContent).toContain('stats.totalMints');
    expect(dashboardContent).toContain('stats.totalVolume');
    expect(dashboardContent).toContain('stats.activeLaunchpads');
  });

  it('should display real activity data', () => {
    expect(dashboardContent).toContain('activities.map((activity)');
    expect(dashboardContent).toContain('activity.type');
    expect(dashboardContent).toContain('activity.description');
  });

  it('should have navigation link to banners page', () => {
    expect(dashboardContent).toContain('<Link href="/admin/banners">');
  });

  it('should have navigation link to collections page', () => {
    expect(dashboardContent).toContain('<Link href="/admin/collections">');
  });

  it('should have navigation link to analytics page', () => {
    expect(dashboardContent).toContain('<Link href="/admin/analytics">');
  });

  it('should format activity timestamps as relative time', () => {
    expect(dashboardContent).toContain('relativeTime');
  });

  it('should display retry button on error', () => {
    expect(dashboardContent).toContain('onClick={refetch}');
    expect(dashboardContent).toContain('onClick={refetchActivities}');
  });
});

describe('Stats API Endpoint Verification', () => {
  const statsApiPath = path.join(process.cwd(), 'src/app/api/admin/stats/route.ts');
  const statsApiContent = fs.readFileSync(statsApiPath, 'utf-8');

  it('should return totalCollections field', () => {
    expect(statsApiContent).toContain('totalCollections');
  });

  it('should return totalMints field', () => {
    expect(statsApiContent).toContain('totalMints');
  });

  it('should return totalVolume field', () => {
    expect(statsApiContent).toContain('totalVolume');
  });

  it('should return activeLaunchpads field', () => {
    expect(statsApiContent).toContain('activeLaunchpads');
  });

  it('should return completedLaunchpads field', () => {
    expect(statsApiContent).toContain('completedLaunchpads');
  });
});

describe('Activities API Endpoint Verification', () => {
  const activitiesApiPath = path.join(process.cwd(), 'src/app/api/admin/activities/route.ts');
  
  it('should exist', () => {
    expect(fs.existsSync(activitiesApiPath)).toBe(true);
  });

  const activitiesApiContent = fs.readFileSync(activitiesApiPath, 'utf-8');

  it('should accept limit parameter', () => {
    expect(activitiesApiContent).toContain("searchParams.get('limit')");
  });

  it('should default to 10 activities', () => {
    expect(activitiesApiContent).toContain('limit = limitParam ? parseInt(limitParam) : 10');
  });

  it('should order by createdAt desc', () => {
    expect(activitiesApiContent).toContain("createdAt: 'desc'");
  });

  it('should add chain names to activities', () => {
    expect(activitiesApiContent).toContain('chainName');
  });
});

describe('Skeleton Component Verification', () => {
  const skeletonPath = path.join(process.cwd(), 'src/components/ui/skeleton.tsx');
  
  it('should exist', () => {
    expect(fs.existsSync(skeletonPath)).toBe(true);
  });

  const skeletonContent = fs.readFileSync(skeletonPath, 'utf-8');

  it('should have animate-pulse class', () => {
    expect(skeletonContent).toContain('animate-pulse');
  });

  it('should have rounded-md class', () => {
    expect(skeletonContent).toContain('rounded-md');
  });

  it('should have bg-muted class', () => {
    expect(skeletonContent).toContain('bg-muted');
  });
});
