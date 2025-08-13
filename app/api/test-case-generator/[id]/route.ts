import { NextRequest, NextResponse } from 'next/server';
import { SimpleTestCase } from '@/lib/database/models/SimpleTestCase';
import { connectToDatabase } from '@/lib/database/connection';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const testCase = await SimpleTestCase.findById(id);

    if (!testCase) {
      return NextResponse.json(
        { error: 'Test case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: testCase._id,
      promptId: testCase.promptId,
      promptName: testCase.promptName,
      version: testCase.version,
      variables: testCase.variables,
      testParameters: testCase.testParameters,
      generatedYaml: testCase.generatedYaml,
      createdAt: testCase.createdAt
    });
  } catch (error) {
    console.error('Error fetching test case:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test case' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const testCase = await SimpleTestCase.findByIdAndDelete(id);

    if (!testCase) {
      return NextResponse.json(
        { error: 'Test case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Test case deleted successfully',
      id: testCase._id,
      promptId: testCase.promptId,
      promptName: testCase.promptName,
      version: testCase.version
    });
  } catch (error) {
    console.error('Error deleting test case:', error);
    return NextResponse.json(
      { error: 'Failed to delete test case' },
      { status: 500 }
    );
  }
}