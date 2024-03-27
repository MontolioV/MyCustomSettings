// go run code/go_performance_tests/fib.go
package main

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

func main() {
	startTime := time.Now()

	// Seed the random number generator with the current time
	rand.Seed(time.Now().UnixNano())

	// Create an array of 1 million random numbers
// 	const arraySize = 1000000
	const arraySize = 100000000
// 	const arraySize = 1000000000
	randomNumbers := make([]int8, arraySize)

	for i := 0; i < arraySize; i++ {
		// 		randomNumbers[i] = rand.Intn(20) // Adjust the range as needed
		randomNumbers[i] = int8(i % 30)
	}

	groupsAmount := 32
	groupSize := arraySize / groupsAmount
	groups := make([]int, groupsAmount)

	var wg sync.WaitGroup
	wg.Add(groupsAmount)

	fmt.Println("Running for loop…")
	for i := 0; i < groupsAmount; i++ {
		go func(i int) {
			defer wg.Done()

			fIdx := i * groupSize
			lIdx := fIdx + groupSize
			for idx := fIdx; idx < lIdx; idx++ {
				groups[i] += fib(randomNumbers[idx])
			}
			groups[i] %= 1000
		}(i)
	}
	wg.Wait()

	// print groups
	//     for i := 0; i < groupsAmount; i++ {
	//         fmt.Printf("i: %v, val: %v\n", i, groups[i])
	//     }

	sum := 0
	for _, num := range groups {
		sum += num
	}
	fmt.Println("sum:", sum)
	fmt.Println("Finished for loop")

	totalTime := time.Since(startTime)
	fmt.Println("totalTime:", totalTime)
}

// func fib(n int) int {
// 	if n <= 1 {
// 		return n
// 	}
// 	return fib(n-1) + fib(n-2)
// }
func fib(n int8) int {
	if n <= 1 {
		return int(n)
	}
	a := 0
	b := 1
	result := 0
	for j := int8(1); j < n; j++ {
	    result = a + b
	    a = b
	    b = result
	}
	return result
}
