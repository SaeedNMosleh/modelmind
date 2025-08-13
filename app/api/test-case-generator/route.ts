import { NextRequest, NextResponse } from 'next/server';
import { SimpleTestCase } from '@/lib/database/models/SimpleTestCase';
import { connectToDatabase } from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const promptId = searchParams.get('promptId');

    const skip = (page - 1) * limit;

    const filter = promptId ? { promptId } : {};

    const testCases = await SimpleTestCase.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('promptId promptName version createdAt _id');

    const total = await SimpleTestCase.countDocuments(filter);

    return NextResponse.json({
      testCases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test cases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { promptId, promptName, version, variables, testParameters, generatedYaml } = body;

    if (!promptId || !promptName || !version || !generatedYaml) {
      return NextResponse.json(
        { error: 'Missing required fields: promptId, promptName, version, generatedYaml' },
        { status: 400 }
      );
    }

    const testCase = await SimpleTestCase.create({
      promptId,
      promptName,
      version,
      variables: variables || {},
      testParameters: testParameters || {},
      generatedYaml
    });

    return NextResponse.json({
      id: testCase._id,
      promptId: testCase.promptId,
      promptName: testCase.promptName,
      version: testCase.version,
      createdAt: testCase.createdAt
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating test case:', error);
    return NextResponse.json(
      { error: 'Failed to create test case' },
      { status: 500 }
    );
  }
}