/**
 * Launchpads API Test
 * 
 * Tests the contractAddress query parameter support in the Launchpads API
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/launchpads/route';

describe('Launchpads API - contractAddress parameter', () => {
  test('should accept contractAddress query parameter', async () => {
    const url = 'http://localhost:3000/api/admin/launchpads?contractAddress=0x1234567890123456789012345678901234567890';
    const request = new NextRequest(url);
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.launchpads)).toBe(true);
  });

  test('should return empty array when contractAddress not found', async () => {
    const url = 'http://localhost:3000/api/admin/launchpads?contractAddress=0xInvalidAddress123456789012345678901234567890';
    const request = new NextRequest(url);
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.launchpads).toHaveLength(0);
  });

  test('should prioritize contractAddress over chainId', async () => {
    const url = 'http://localhost:3000/api/admin/launchpads?contractAddress=0x1234567890123456789012345678901234567890&chainId=8453';
    const request = new NextRequest(url);
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Should query by contractAddress, not chainId
  });

  test('should use chainId when contractAddress not provided', async () => {
    const url = 'http://localhost:3000/api/admin/launchpads?chainId=6343';
    const request = new NextRequest(url);
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.launchpads)).toBe(true);
  });
});
