package com.marketingquantitative.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Marketing Quantitative API")
                .description("""
                    Quantitative marketing analysis tools:
                    Matrix Gains (maxi-max / maxi-min), Economic Order Quantity,
                    Break-even Analysis, M/M/s Queue metrics, and Decision Tree EMV.
                    """)
                .version("1.0.0")
                .contact(new Contact().name("Marketing Quantitative")));
    }
}
