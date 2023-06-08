library(openai)
library(tidyverse)

# Load the OpenAI API key
openai$api_key <- Sys.getenv("OPENAI_API_KEY")

# Define the R equivalent functions

extract_functions <- function(file_path, exclude_docstrings = TRUE) {
  source <- readLines(file_path, warn = FALSE)
  module <- parse(text = source)
  functions <- Filter(function(node) node[[1]] == "function", module)
  if (exclude_docstrings) {
    functions <- Filter(function(function_node) {
      !grepl("^\\s*['\"]{3}", function_node$body$value[[1]]$value)
    }, functions)
  }
  functions
}

format_docstring <- function(docstring) {
  docstring <- gsub('"', "", docstring)
  words <- strsplit(docstring, " ")[[1]]
  formatted_docstring <- paste0("# '", words[1], "'\n\n")
  line <- ""
  for (word in words[-1]) {
    line <- paste(line, word)
    if (nchar(line) > 80) {
      formatted_docstring <- paste0(formatted_docstring, line, "\n")
      line <- ""
    }
  }
  if (nchar(line) > 0) {
    formatted_docstring <- paste0(formatted_docstring, line, "\n")
  }
  formatted_docstring
}
EXAMPLE_PROMPT1 <- "Here are two examples of functions with great documentation:
#' Calculate the mean of a numeric vector
#'
#' This function calculates the arithmetic mean of a numeric vector. The mean is obtained by summing up all the elements in the vector and dividing it by the total number of elements.
#'
#' @param vec A numeric vector.
#'
#' @return The arithmetic mean of the input vector.
#'
#' @examples
#' my_vector <- c(1, 2, 3, 4, 5)
#' mean_value <- mean(my_vector)
#' mean_value
#' # Output: 3
#'
#' empty_vector <- numeric(0)
#' mean(empty_vector)
#' # Output: NaN
#'
#' @export
calculate_mean <- function(vec) {
  return(mean(vec))
}

#' Check if a number is prime
#'
#' This function checks if a given number is prime or not. A prime number is a positive integer greater than 1 that has no positive divisors other than 1 and itself.
#'
#' @param n The number to be checked for primality.
#'
#' @return A logical value indicating whether the input number is prime (TRUE) or not (FALSE).
#'
#' @examples
#' is_prime(7)
#' # Output: TRUE
#'
#' is_prime(10)
#' # Output: FALSE
#'
#' @export
is_prime <- function(n) {
  if (n <= 1) {
    return(FALSE)
  } else if (n <= 3) {
    return(TRUE)
  } else if (n %% 2 == 0 | n %% 3 == 0) {
    return(FALSE)
  }
  i <- 5
  while (i * i <= n) {
    if (n %% i == 0 | n %% (i + 2) == 0) {
      return(FALSE)
    }
    i <- i + 6
  }
  return(TRUE)
}
"
EXAMPLE_PROMPT2  <- "Here are two examples of functions with great documentation:
#' Calculate the factorial of a number
#'
#' This function calculates the factorial of a non-negative integer. The factorial of a number is the product of all positive integers less than or equal to that number.
#'
#' @param n The non-negative integer for which the factorial is to be calculated.
#'
#' @return The factorial of the input number.
#'
#' @examples
#' factorial(5)
#' # Output: 120
#'
#' factorial(0)
#' # Output: 1
#'
#' factorial(10)
#' # Output: 3628800
#'
#' @export
factorial <- function(n) {
  if (n == 0) {
    return(1)
  } else {
    return(n * factorial(n - 1))
  }
}

#' Calculate the sum of squares of a vector
#'
#' This function calculates the sum of squares of a numeric vector. It squares each element of the vector and then sums up the squared values.
#'
#' @param vec A numeric vector.
#'
#' @return The sum of squares of the input vector.
#'
#' @examples
#' my_vector <- c(1, 2, 3, 4, 5)
#' sum_of_squares(my_vector)
#' # Output: 55
#'
#' empty_vector <- numeric(0)
#' sum_of_squares(empty_vector)
#' # Output: 0
#'
#' @export
sum_of_squares <- function(vec) {
  return(sum(vec^2))
}
"

generate_docstring <- function(function_string, attempts = 0) {
  context_prompt <- "You are an expert programmer with 20+ years of experience; you are very good at writing concise, clean, and efficient R code. Your only job is to write concise function documentation."
  docstring_prompt <- "Your responses should follow the R documentation conventions. A good documentation consists of a title line followed by a blank line and then a more elaborate description. The documentation for a function should summarize its behavior, document its arguments, return value(s), side effects, exceptions raised, and any restrictions on when it can be called (if applicable). Short and simple functions only need a one-liner documentation. Lines over 80 characters must be broken into a new line using '\\n'."
  prompt <- paste0("Generate a concise but informative documentation for the following function. You should just return the documentation and nothing else. JUST RETURN THE DOCUMENTATION AND NOTHING ELSE. Be as concise as possible. Function:\n\n", function_string, "\n\n \n    ")
  messages <- list(
    list(role = "system", content = context_prompt),
    list(role = 'system', content = EXAMPLE_PROMPT1),
    list(role = 'system', content = EXAMPLE_PROMPT2),
    list(role = "system", content = docstring_prompt),
    list(role = "user", content = prompt)
  )
  response <- openai$ChatCompletion$create(
    model = "gpt-3.5-turbo",
    messages = messages,
    max_tokens = 500
  )
  docstring <- response$choices[[1]]$message$content
  docstring
}

add_docstring <- function(function_node, is_retry = FALSE) {
  function_string <- deparse(function_node$body)
  docstring <- generate_docstring(function_string)
  docstring <- format_docstring(docstring)
  tryCatch(
    {
      parsed_docstring <- parse(text = docstring)[[1]]
      function_node$body <- append(parsed_docstring, function_node$body)
    },
    error = function(e) {
      if (is_retry) {
        print(docstring)
        stop(e)
      } else {
        add_docstring(function_node, is_retry = TRUE)
      }
    }
  )
  function_node
}

add_docstrings_to_file <- function(file_path, format = FALSE) {
  source <- readLines(file_path, warn = FALSE)
  module <- parse(text = source)
  functions <- Filter(function(node) node[[1]] == "function", module)
  for (i in seq_along(functions)) {
    function_node <- functions[[i]]
    if (!grepl("^\\s*#'\\s*", function_node$body$value[[1]]$value)) {
      print("\t", function_node[[2]])
      functions[[i]] <- add_docstring(function_node)
    }
  }
  output <- deparse(module)
  writeLines(output, con = file_path)
  if (format) {
    system(paste("styler::style_file", file_path))
  }
}

document <- function(path) {
  if (file.exists(path)) {
    if (is.dir(path)) {
      files <- list.files(path, recursive = TRUE, pattern = "\\.R$", full.names = TRUE)
    } else {
      files <- path
    }
    for (file_path in files) {
      if (!grepl("__", file_path)) {
        print(file_path)
        add_docstrings_to_file(file_path)
      }
    }
  } else {
    stop("File or directory not found.")
  }
}

# Main function
main <- function() {
  parser <- argparse.ArgumentParser()
  parser$add_argument("file_path", help = "path to file or directory that you want to document")
  args <- parser$parse_args()
  document(args$file_path)
}

# Call the main function if the script is being called from command line.
# needs to be tested
# if (!interactive()){
#     main()
# }


