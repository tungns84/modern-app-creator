package com.acme.spike;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/** Proves MapStruct 1.6.3 generated GreetingMapperImpl at compile time on javac 25. */
class GreetingMapperTest {

    @Test
    void mapperImplGeneratedAndMaps() {
        GreetingMapper mapper = GreetingMapper.INSTANCE;
        assertNotNull(mapper, "MapStruct processor must have generated GreetingMapperImpl");

        GreetingDto dto = mapper.toDto(new Greeting("jdk25", 9));
        assertEquals("jdk25", dto.getName());
        assertEquals(9, dto.getEnthusiasm());
    }
}
