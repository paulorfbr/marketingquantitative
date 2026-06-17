package com.marketingquantitative.service;

import com.marketingquantitative.dto.QueueRequest;
import com.marketingquantitative.dto.QueueResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QueueService {

    @Transactional(readOnly = true)
    public QueueResponse calculate(QueueRequest request) {
        double lambda = request.arrivalRate();
        double mu     = request.serviceRate();
        int    s      = request.servers();

        if (s * mu <= lambda) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "system is unstable: total service rate must exceed arrival rate");
        }

        double r   = lambda / mu;
        double rho = r / s;

        // P₀ = 1 / [ Σ_{n=0}^{s-1} rⁿ/n! + rˢ / (s! · (1−ρ)) ]
        double sum = 0;
        for (int n = 0; n < s; n++) sum += Math.pow(r, n) / factorial(n);
        double p0 = 1.0 / (sum + Math.pow(r, s) / (factorial(s) * (1 - rho)));

        double lq = (p0 * Math.pow(r, s) * rho) / (factorial(s) * Math.pow(1 - rho, 2));
        double l  = lq + r;
        double wq = lq / lambda;
        double w  = l  / lambda;

        return new QueueResponse(rho, p0, lq, l, wq, w);
    }

    private long factorial(int n) {
        long result = 1;
        for (int i = 2; i <= n; i++) result *= i;
        return result;
    }
}
