# Use Case: Matrix Gains

## Actor
- Marketing analyst OR
- Manager

## Precondition
- User is logged in the system with the correct profile

## Main flow
1. User clicks to add a new Gain Matrix
2. User clicks to add a new line
3. User inputs the strategy at first column
4. User inputs can add multiple columns for the answer of each competitive strategy and the expected value

## Post-conditions

### Outcome
1. System shall calculate the optimistic (maxi-max) and show in result table
2. System shall calculate pessimist in same result table (in a different line)

### Success Criteria
1. Both optimistic and pessimist are displayed (p95 < 300 ms)